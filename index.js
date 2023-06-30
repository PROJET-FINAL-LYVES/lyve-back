require('dotenv').config();

// dependencies
const mongoose = require("mongoose");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// constants
const { START_VIDEO_EVENT, MESSAGE_EVENT, ADD_VIDEO_EVENT } = require('./constants/socket');

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


io.on('connection', (socket) => {
    socket.on('join room', (roomId) => {
        console.log('A user joined room ' + roomId + '!');
        socket.join(roomId);
    });

    socket.on('chat message', (roomId, msg) => {
        io.to(roomId).emit('chat message', msg);
    });
   
    socket.on('video action', (roomId, action) => {
        console.log(roomId, action);
        if (action.type === 'play') {
            io.to(roomId).emit('video action', action);
        } else if (action.type === 'pause') {
            io.to(roomId).emit('video action', action);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});