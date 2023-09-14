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

const { verifyJsonWebToken, generateRandomString, checkUrlIsValid, getVideoIdFromUrl } = require('./helpers');
const { MAX_ROOM_USERS_LIMIT, MUSIC_TYPES, MESSAGE_INTERVAL, MAX_MESSAGE_LENGTH } = require('./constants/app');
const {
    CREATE_ROOM_EVENT,
    DELETE_ROOM_EVENT,
    JOIN_ROOM_EVENT,
    LEAVE_ROOM_EVENT,
    GET_ROOMS_EVENT,
    NEW_MESSAGE_EVENT,
    ADD_SONG_EVENT,
    REMOVE_SONG_EVENT
} = require('./constants/socket');
const { getVideoData } = require("./helpers/youtube");
// const { verifyJsonWebToken, generateRandomString} = require('./helpers');
// const { JOIN_ROOM_EVENT, LEAVE_ROOM_EVENT} = require("./constants/socket");
// const {MAX_ROOM_USERS_LIMIT, MUSIC_TYPES} = require("./constants/app");


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

// ROUTES
app.post('/login', userController.login);
app.post('/register', userController.register);

const hosts = {};
const rooms = {};
const playlists = {};
const playerStates = {};
const usersLastMessageDate = {};

// get rooms filtered by most active one
const getRoomsByActivity = () => {
    return rooms.sort((a, b) => a.userList.length - b.userList.length);
};

// each socket must have a valid JWT
io.use((socket, next) => {
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

    // ROOMS EVENTS
    // ***********************************************************
    socket.on('fetch_rooms', () => {
        socket.emit('initial_rooms', Object.values(rooms));
    });

    socket.on('create room', ({ name, userId, type, maxUsers, musicType }) => {
        // const isOwnerOfRoom = Object.values(rooms).find(room => room.hostId === socket.user._id);
        // if (isOwnerOfRoom) return socket.emit('create room', { message: 'Already owner of a room.' });
        if (maxUsers > MAX_ROOM_USERS_LIMIT) return socket.emit('create room', { message: 'Max users value too high.' });
        if (MUSIC_TYPES.includes(type)) return socket.emit('create room', { message: 'Invalid music type.' });

        const roomId = generateRandomString();
        rooms[roomId] = {
            roomId: roomId,
            name,
            hostId: userId,
            userList: [],
            songList: [],
            type,
            maxUsers,
            musicType,
            // timeout,
            creationDate: Date.now()
        };
        return socket.emit('create room', rooms[roomId].roomId);
    });

    socket.on('join room v2', (roomId, userId) => {
        if (!rooms[roomId]) return socket.emit('join room v2', { message: 'Room doesn\'t exist.' });
        if (rooms[roomId].userList.length >= rooms[roomId].maxUsers) return socket.emit('join room v2', { message: 'Room is full.' });

        if (!rooms[roomId].userList.some(user => user.id === socket.user._id)) {
            rooms[roomId].userList.push({ id: socket.user._id, username: socket.user.username });
        }

        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = [];
            playerStates[roomId] = 'paused';
        }

        if (socket.user._id !== rooms[roomId].hostId) {
            console.log('get player state from host', rooms[roomId].hostId, socket.user._id)
            socket.to(rooms[roomId].hostId).emit('get player state', socket.user._id);
        }

        if (rooms[roomId].songList && rooms[roomId].songList.length > 0) {
            const currentVideoId = rooms[roomId].songList[0].url;
            socket.emit('set video url', currentVideoId);
        }

        io.to(roomId).emit('update playlist', rooms[roomId].songList || [])
        socket.emit('host status', socket.user._id === rooms[roomId].hostId);
        const usernames = rooms[roomId].userList.map(user => ({ id: user._id, username: user.username }));
        io.to(roomId).emit('room users', usernames);

        return socket.emit('join room v2', roomId);
    });

    socket.on('leave room v2', roomId => {
        if (!rooms[roomId]) return socket.emit('leave room v2', { message: 'Room doesn\'t exist.' });
        const userIndex = rooms[roomId].userList.findIndex(user => user.id === socket.user._id);
        if (userIndex !== -1) {
            rooms[roomId].userList.splice(userIndex, 1);
        }

        if (rooms[roomId].userList.length === 0) {
            delete rooms[roomId];
            io.to(roomId).emit('room users', []);
        } else {
            const usernames = rooms[roomId].userList.map(user => ({ id: user.id, username: user.username }));
            io.to(roomId).emit('room users', usernames);
        }

        socket.leave(roomId);

        return socket.emit('leave room v2', roomId);
    });

    socket.on('delete room', roomId => {
        const room = rooms[roomId];
        if (!room) return socket.emit('delete room', { message: 'La room n\'éxiste pas.' });

        if (room.hostId !== socket.user._id) {
            return socket.emit('delete room', { message: 'Vous n\'êtes pas le propriétaire de cette room.' });
        }

        io.to(roomId).emit('delete room', roomId);
        io.emit('delete room', roomId);
        io.socketsLeave(roomId);
        delete rooms[roomId];
    });

    socket.on(GET_ROOMS_EVENT, () => {
        socket.emit(GET_ROOMS_EVENT, getRoomsByActivity());
    });

    // CHAT EVENTS
    // ***********************************************************

    socket.on('chat message', (roomId, message, username) => {
        if (!rooms[roomId]) {
            return socket.emit('chat message error', 'Room doesn\'t exist.');
        }
        if (!rooms[roomId].userList.some(user => user.id === socket.user._id)) {
            return socket.emit('chat message error', 'You are not in this room.');
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            return socket.emit('chat message error', 'Message too long.');
        }

        const userLastMessageDate = usersLastMessageDate[socket.user._id];
        if (userLastMessageDate + MESSAGE_INTERVAL >= Date.now()) {
            return socket.emit('chat message error', 'Too fast.');
        }

        usersLastMessageDate[socket.user._id] = Date.now();
        const messageWithUsername = { text: message, username };

        io.to(roomId).emit('chat message', messageWithUsername);
    });

    // SONGS EVENTS
    // ***********************************************************
    socket.on('add video v2', async (roomId, url) => {
        console.log('add video v2', roomId, url);
        if (!rooms[roomId]) {
            console.log('Room doesn\'t exist.')
            return socket.emit('add video v2', { message: 'Room doesn\'t exist.' });
        }

        // check user is in room
        if (!rooms[roomId].userList.some(user => user.id === socket.user._id)) {
            console.log('You are not in this room.')
            return socket.emit('add video v2', { message: 'You are not in this room.' });
        }

        // check user has not a pending song in this room
        // const userSongIndex = rooms[roomId].songList.findIndex(song => song.userId === socket.user._id);
        // if (userSongIndex !== -1) {
        //     return socket.emit('add video v2', { message: 'You already have a pending song in this room.' });
        // } 

        // check URL is valid
        const videoId = getVideoIdFromUrl(url);
        if (!videoId) {
            console.log('Invalid URL format.')
            return socket.emit('add video v2', { message: 'Invalid URL format.' });
        }

        const videoData = await getVideoData(videoId);
        rooms[roomId].songList.push({ ...videoData, url, userId: socket.user._id, username: socket.user.username });
        if (rooms[roomId].songList.length === 1) {
            io.to(roomId).emit('set video url', url);
        }

        io.to(roomId).emit('update playlist', rooms[roomId].songList)
        io.to(roomId).emit('add video v2', { ...videoData, url, userId: socket.user._id });
    });

    socket.on('remove song v2', (roomId, songIndex, userId) => {
        if (!rooms[roomId]) {
            return
        }

        const song = rooms[roomId].songList[songIndex];
        if (!song) {
            return socket.emit('remove song v2', { message: 'Song doesn\'t exist.' });
        }

        console.log(song.userId, socket.user._id, rooms[roomId].hostId, userId)
        if (!song.userId === userId || !userId === rooms[roomId].hostId) {
            return socket.emit('remove song v2', { message: 'You are not allowed to remove this song.' });
        }
        if (rooms[roomId].songList && songIndex < rooms[roomId].songList.length) {
            rooms[roomId].songList.splice(songIndex, 1);
            io.to(roomId).emit('update playlist', rooms[roomId].songList);
        }
    });

    // PLAYER EVENTS
    // ***********************************************************

    socket.on('send player state', (newUserId, currentTime, playerState) => {
        console.log('send player state', newUserId, currentTime, playerState)
        socket.to(newUserId).emit('edit client player state', currentTime, playerState);
    });

    socket.on('get room users', (roomId) => {
        const room = rooms[roomId];
        const roomUsers = room ? room.userList.map(user => user.username) : [];
        socket.emit('room users', roomUsers);

    });

    socket.on('get video url', (roomId) => {
        if (!rooms[roomId]) {
            return;
        }

        if (rooms[roomId].songList && rooms[roomId].songList.length > 0) {
            const currentVideoId = rooms[roomId].songList[0];
            socket.to(socket.user._id).emit('set video url', currentVideoId);
        }
    });

    socket.on('video action', (roomId, action) => {
        console.log('video action', roomId, action)
        const currentTime = action.time;
        if (socket.user._id === rooms[roomId].hostId) {
            if (action.type === 'play' || action.type === 'pause') {
                rooms[roomId].playerState = (action.type === 'play') ? 'playing' : 'paused';
                action.time = currentTime;
                socket.broadcast.to(roomId).emit('client video action', action, currentTime);
            }
        }
    });

    socket.on('video start', (roomId) => {
        console.log('video start', roomId)
        rooms[roomId].playerState = 'playing';
    });

    socket.on('next video', (roomId) => {
        if (rooms[roomId].songList && rooms[roomId].songList.length > 0) {
            rooms[roomId].songList.shift();
            if (rooms[roomId].songList.length === 0) {
                io.to(roomId).emit('set video url', '');
                io.to(roomId).emit('update playlist', rooms[roomId].songList);
                return
            }
            const nextVideo = rooms[roomId].songList[0].url;
            if (nextVideo) {
                io.to(roomId).emit('set video url', nextVideo);
            }
            io.to(roomId).emit('update playlist', rooms[roomId].songList);
        }
    });

    socket.on('clear playlist', (roomId) => {
        if (socket.user._id === rooms[roomId].hostId) {
            if (rooms[roomId].songList && rooms[roomId].songList.length > 0) {
                rooms[roomId].songList = [rooms[roomId].songList[0]];
            } else {
                rooms[roomId].songList = [];
            }
            io.to(roomId).emit('update playlist', rooms[roomId].songList);
        }
    });

    // USER EVENTS
    // ***********************************************************
    socket.on('error', (error) => {
        console.log('Socket Error: ', error);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.user._id);
    });

});

server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
