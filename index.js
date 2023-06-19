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


let videoStartTime = null;

let currentVideoId = null;

io.on('connection', (socket) => {
    console.log('a user connected');

    if (currentVideoId) {
        // send the current video and start time to the newly connected client
        socket.emit('new video', { videoId: currentVideoId, startTime: videoStartTime });
    }

    // listen for the 'start video' event
    socket.on('start video', (newVideoId) => {
        currentVideoId = newVideoId;
        videoStartTime = Date.now();

        // emit the 'new video' event to all connected clients
        io.emit('new video', { videoId: currentVideoId, startTime: videoStartTime });
    });


    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});