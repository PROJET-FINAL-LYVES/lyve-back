require('dotenv').config();

// dependencies
const mongoose = require("mongoose");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// initializations
const app = express();
const port = process.env.APP_PORT;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // specify the domain of the client
        methods: ["GET", "POST"]
    }
});

// controllers
const userController = require('./controllers/user');
const videoController = require('./controllers/video');
const cors = require('cors');

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

app.get('/', (req, res) => {
    return res.json({ success: true });
});

// USER ROUTES
app.post('/login', userController.login);
app.post('/register', userController.register);
app.get('/logout', userController.logout);

// Use the middleware function for protecting sensitive routes
app.get('/dashboard', userController.requireAuth, (req, res) => {
    res.render('dashboard');
});

const hosts = {};
const rooms = {};
const playlists = {};
const playerStates = {};



io.on('connection', (socket) => {
    socket.on('join room', (roomId) => {
        socket.join(roomId);
        console.log('A user joined room ' + roomId + '!');

        // Si la room n'a pas encore de liste de sockets, on la crée
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        // On ajoute la nouvelle socket à la liste si elle n'y est pas déjà
        if (!rooms[roomId].includes(socket.id)) {
            rooms[roomId].push(socket.id);
        }

        console.log('Room ' + roomId + ' has sockets: ' + rooms[roomId]);
        // Si la room n'a pas encore d'hôte, la première socket devient l'hôte
        if (!hosts[roomId]) {
            hosts[roomId] = rooms[roomId][0];
            console.log('Host of room ' + roomId + ' is ' + hosts[roomId]);
        }

        socket.emit('host status', socket.id === hosts[roomId]);
    });

    socket.on('chat message', (roomId, msg) => {
        io.to(roomId).emit('chat message', msg);
    });

    socket.on('video action', (roomId, action) => {
        const currentTime = action.time;
        if (socket.id === hosts[roomId]) {
            if (action.type === 'play') {
                action.time = currentTime;
                console.log('Received video action: ', action);
                socket.broadcast.to(roomId).emit('video action', action, currentTime);
            } else if (action.type === 'pause') {
                action.time = currentTime;
                console.log('Received video action: ', action);
                socket.broadcast.to(roomId).emit('video action', action, currentTime);
            }
        }
    });

    socket.on('video start', (roomId) => {
        playerStates[roomId] = 'playing';
    });

    socket.on('video end', (roomId) => {
        playerStates[roomId] = 'idle';

        if (playlists[roomId] && playlists[roomId].length > 0) {
            const nextVideo = playlists[roomId].shift();

            io.to(roomId).emit('update playlist', playlists[roomId]);
            io.to(roomId).emit('play video', nextVideo);
        }
    });

    socket.on('add video', (roomId, videoUrl) => {
        if (!playlists[roomId]) {
            playlists[roomId] = [];
        }

        playlists[roomId].push(videoUrl);

        io.to(roomId).emit('update playlist', playlists[roomId]);

        if (socket.id === hosts[roomId] && (playlists[roomId].length === 1 || playerStates[roomId] === 'idle')) {
            io.to(roomId).emit('play video', videoUrl);
        }
    });


    socket.on('next video', (roomId) => {
        if (playlists[roomId] && playlists[roomId].length > 0) {
            const nextVideo = playlists[roomId].shift();

            io.to(roomId).emit('update playlist', playlists[roomId]);

            if (playerStates[roomId] !== 'playing') {
                io.to(roomId).emit('play video', nextVideo);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        // Pour chaque room
        for (const roomId in rooms) {
            // On trouve l'index de la socket dans la liste
            const index = rooms[roomId].indexOf(socket.id);
            if (index > -1) {
                // On retire la socket de la liste
                rooms[roomId].splice(index, 1);

                // Si la socket était l'hôte, on attribue l'hôte à la prochaine socket dans la liste
                if (hosts[roomId] === socket.id) {
                    console.log('Host of room ' + roomId + ' is now ' + rooms[roomId][0]);
                    hosts[roomId] = rooms[roomId][0];

                    // Send host status update to the new host
                    io.to(hosts[roomId]).emit('host status', true);
                }
            }
        }
    });
});

server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
