require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.APP_PORT;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

const userController = require('./controllers/user');

const { verifyJsonWebToken, generateRandomString} = require('./helpers');
const { CREATE_ROOM_EVENT, DELETE_ROOM_EVENT, JOIN_ROOM_EVENT, LEAVE_ROOM_EVENT} = require("./constants/socket");
const {MAX_ROOM_USERS_LIMIT, MUSIC_TYPES} = require("./constants/app");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Database connection successful');
    })
    .catch(err => {
        console.error('Database connection error');
    });

app.post('/login', userController.login);
app.post('/register', userController.register);
app.get('/logout', userController.logout);

const hosts = {};
const rooms = {};
const playlists = {};
const playerStates = {};

// get rooms filtered by most active one
const getRoomsByActivity = () => {
    return rooms.sort((a, b) => a.userList.length - b.userList.length);
};

// each socket must have a valid JWT
io.use((socket, next) => {
    console.log(socket.handshake.auth);
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Forbidden access.'));
    }

    const { tokenData, error } = verifyJsonWebToken(token);
    if (error) {
        return next(new Error(error));
    }

    socket.user = tokenData;
    next();
});

io.on('connection', (socket) => {
    socket.on(CREATE_ROOM_EVENT, ({ name, type, maxUsers, timeout }) => {
        // can't create room if already owner of one
        const isOwnerOfRoom = Object.values(rooms).find(room => room.hostId === socket.user._id);
        if (isOwnerOfRoom) return socket.emit(CREATE_ROOM_EVENT, { message: 'Already owner of a room.' });

        // check max users is not too high
        if (maxUsers > MAX_ROOM_USERS_LIMIT) return socket.emit(CREATE_ROOM_EVENT, { message: 'Max users value too high.' });

        // check music type is valid
        if (MUSIC_TYPES.includes(type)) return socket.emit(CREATE_ROOM_EVENT, { message: 'Invalid music type.' });

        const roomId = generateRandomString();
        rooms[roomId] = {
            name,
            hostId: socket.user._id,
            userList: [],
            songList: [],
            type,
            maxUsers,
            timeout,
            creationDate: Date.now()
        };

        // inform client that room has been created
        return socket.emit(CREATE_ROOM_EVENT, roomId);
    });

    socket.on(JOIN_ROOM_EVENT, roomId => {
        if (!rooms[roomId]) return socket.emit(JOIN_ROOM_EVENT, { message: 'Room doesn\'t exist.' });
        if (rooms[roomId].userList.length >= rooms[roomId].maxUsers) return socket.emit(JOIN_ROOM_EVENT, { message: 'Room is full.' });

        if (!rooms[roomId].userList.includes(socket.user._id)) rooms[roomId].userList.push(socket.user._id);

        socket.join(roomId);

        // inform client that he has joined the room
        return socket.emit(JOIN_ROOM_EVENT, roomId);
    });

    socket.on(LEAVE_ROOM_EVENT, roomId => {
        if (!rooms[roomId]) return socket.emit(LEAVE_ROOM_EVENT, { message: 'Room doesn\'t exist.' });

        // remove user from userList
        const userIndex = rooms[roomId].userList.indexOf(socket.user._id);
        if (userIndex !== -1) {
            rooms[roomId].userList.splice(userIndex, 1);
        }

        // if no users left in room, delete it
        if (rooms[roomId].userList.length === 0) {
            delete rooms[roomId];
        }
        // if host left, replace him by oldest user in room
        else if (rooms[roomId].hostId === socket.user._id) {
            rooms[roomId].hostId = rooms[roomId].userList[0];
        }

        socket.leave(roomId);

        // inform client that he has left the room
        return socket.emit(LEAVE_ROOM_EVENT, roomId);
    });

    socket.on(DELETE_ROOM_EVENT, roomId => {
        const room = rooms[roomId];
        if (!room) return socket.emit(DELETE_ROOM_EVENT, { message: 'Room doesn\'t exist.' });

        // only room's owner and admins can delete room
        if (room.hostId !== socket.user.id && socket.user.role !== 'admin') {
            return socket.emit(DELETE_ROOM_EVENT, { message: 'You are not the owner of this room.' });
        }

        // inform every user in room that it has been deleted
        io.to(roomId).emit(DELETE_ROOM_EVENT, roomId);

        io.socketsLeave(roomId); // disconnect everyone from this room
        delete rooms[roomId];
    });

    socket.on('join room', (roomId) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = [];
            playerStates[roomId] = 'paused';
        }

        if (!rooms[roomId].includes(socket.id)) {
            rooms[roomId].push(socket.id);
        }

        if (!hosts[roomId]) {
            hosts[roomId] = rooms[roomId][0];
        }

        if (socket.id !== hosts[roomId]) {
            socket.to(hosts[roomId]).emit('get player state', socket.id);
        }

        if (playlists[roomId] && playlists[roomId].length > 0) {
            const currentVideoId = playlists[roomId][0];
            socket.emit('set video url', currentVideoId);
        }

        socket.emit('update playlist', playlists[roomId] || []);
        socket.emit('host status', socket.id === hosts[roomId]);
        io.to(roomId).emit('room users', rooms[roomId]);
    });

    socket.on('send player state', (newUserId, currentTime, playerState) => {
        socket.to(newUserId).emit('edit client player state', currentTime, playerState);
    });

    socket.on('get room users', (roomId) => {
        const roomUsers = rooms[roomId] || [];
        socket.emit('room users', roomUsers);
    });

    socket.on('chat message', (roomId, msg) => {
        io.to(roomId).emit('chat message', msg);
    });

    const videoActionHandler = (roomId, action) => {
        const currentTime = action.time;
        if (socket.id === hosts[roomId]) {
            if (action.type === 'play' || action.type === 'pause') {
                playerStates[roomId] = (action.type === 'play') ? 'playing' : 'paused';
                action.time = currentTime;
                socket.broadcast.to(roomId).emit('client video action', action, currentTime);
            }
        }
    };
    socket.on('video action', videoActionHandler);

    socket.on('video start', (roomId) => {
        playerStates[roomId] = 'play';
    });

    socket.on('get video url', (roomId) => {
        if (playlists[roomId] && playlists[roomId].length > 0) {
            const currentVideoId = playlists[roomId][0];
            socket.to(socket.id).emit('set video url', currentVideoId);
        }
    });

    socket.on('add video', (roomId, videoUrl) => {
        if (!playlists[roomId]) {
            playlists[roomId] = [];
        }
        playlists[roomId].push(videoUrl);

        io.to(roomId).emit('update playlist', playlists[roomId]);

        if (playlists[roomId].length === 1) {
            io.to(roomId).emit('set video url', videoUrl);
        }
    });

    socket.on('next video', (roomId) => {
        if (playlists[roomId] && playlists[roomId].length > 0) {
            playlists[roomId].shift();
            const nextVideo = playlists[roomId][0];
            if (nextVideo) {
                io.to(roomId).emit('set video url', nextVideo);
            }
            io.to(roomId).emit('update playlist', playlists[roomId]);
        }
    });

    socket.on('clear playlist', (roomId) => {
        if (socket.id === hosts[roomId]) {
            if (playlists[roomId] && playlists[roomId].length > 0) {
                playlists[roomId] = [playlists[roomId][0]];
            } else {
                playlists[roomId] = [];
            }
            io.to(roomId).emit('update playlist', playlists[roomId]);
        }
    });

    socket.on('remove song', (roomId, songIndex) => {
        if (socket.id === hosts[roomId]) {
            if (playlists[roomId] && songIndex < playlists[roomId].length) {
                playlists[roomId].splice(songIndex, 1);
                io.to(roomId).emit('update playlist', playlists[roomId]);
            }
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const index = rooms[roomId].indexOf(socket.id);
            if (index > -1) {
                rooms[roomId].splice(index, 1);
                if (hosts[roomId] === socket.id) {
                    hosts[roomId] = rooms[roomId][0];

                    io.to(hosts[roomId]).emit('host status', true);
                }

                io.to(roomId).emit('room users', rooms[roomId]);

                if (rooms[roomId].length === 0) {
                    playlists[roomId] = [];
                    io.to(roomId).emit('update playlist', playlists[roomId]);
                    delete hosts[roomId];
                    delete playerStates[roomId]; 
                }
            }
        }
    });

});

server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
