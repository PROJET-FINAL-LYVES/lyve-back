require('dotenv').config();

// dependencies
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// initializations
const app = express();
const port = process.env.APP_PORT;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000', // specify the domain of the client
        methods: ['GET', 'POST']
    }
});

const userController = require('./controllers/user');
const videoController = require('./controllers/video');

const { verifyJsonWebToken } = require('./helpers');

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

app.get('/dashboard', verifyJsonWebToken, (req, res) => {
    res.render('dashboard');
});

const hosts = {};
const rooms = {};
const playlists = {};
const playerStates = {};

io.on('connection', (socket) => {
    socket.on('join room', (roomId) => {
        console.log('Nouvel utilisateur ' + roomId);
        socket.join(roomId);

        if (!rooms[roomId]) {
            console.log('Creating new room ' + roomId);
            rooms[roomId] = [];
            playerStates[roomId] = 'paused';
        }

        if (!rooms[roomId].includes(socket.id)) {
            rooms[roomId].push(socket.id);
        }

        if (!hosts[roomId]) {
            hosts[roomId] = rooms[roomId][0];
            console.log('Host of room ' + roomId + ' is ' + hosts[roomId]);
        }

        if (socket.id !== hosts[roomId]) {
            socket.to(hosts[roomId]).emit('get player state', socket.id);
            console.log('Asking host of room ' + roomId + ' for player state');
        }

        if (playlists[roomId] && playlists[roomId].length > 0) {
            console.log('Sending video to ' + socket.id);
            const currentVideoId = playlists[roomId][0];
            console.log('Current video: ' + currentVideoId);
            socket.emit('set video url', currentVideoId);
        }

        socket.emit('update playlist', playlists[roomId] || []);
        socket.emit('host status', socket.id === hosts[roomId]);
        io.to(roomId).emit('room users', rooms[roomId]);
    });

    socket.on('send player state', (newUserId, currentTime, playerState) => {
        socket.to(newUserId).emit('edit client player state', currentTime, playerState);
        console.log('Sent current state to [' + newUserId + '] (time: ' + currentTime + ', state: ' + playerState + ')');
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
            console.log('Sending video to ' + socket.id);
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
        console.log('Next video in room ' + roomId);
        if (playlists[roomId] && playlists[roomId].length > 0) {
            playlists[roomId].shift();
            const nextVideo = playlists[roomId][0];
            if (nextVideo) {
                io.to(roomId).emit('set video url', nextVideo);
            }
            io.to(roomId).emit('update playlist', playlists[roomId]);
            console.log('Playing next video in room ' + roomId + ': ' + nextVideo);
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
            console.log(`Host of room ${roomId} cleared the playlist but kept the first video.`);
        }
    });

    socket.on('remove song', (roomId, songIndex) => {
        if (socket.id === hosts[roomId]) {
            if (playlists[roomId] && songIndex < playlists[roomId].length) {
                playlists[roomId].splice(songIndex, 1);
                io.to(roomId).emit('update playlist', playlists[roomId]);
                console.log(`Host of room ${roomId} removed song at index ${songIndex}.`);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        for (const roomId in rooms) {
            const index = rooms[roomId].indexOf(socket.id);
            if (index > -1) {
                rooms[roomId].splice(index, 1);
                console.log('Removed user ' + socket.id + ' from room ' + roomId);
                if (hosts[roomId] === socket.id) {
                    console.log('Host of room ' + roomId + ' is now ' + rooms[roomId][0]);
                    hosts[roomId] = rooms[roomId][0];

                    io.to(hosts[roomId]).emit('host status', true);
                }

                io.to(roomId).emit('room users', rooms[roomId]);

                if (rooms[roomId].length === 0) {
                    console.log(`Room ${roomId} is empty, clearing playlist.`);
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
