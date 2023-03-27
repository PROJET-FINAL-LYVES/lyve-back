require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const port = process.env.APP_PORT;
const server = http.createServer(app);
const io = new Server(server);
const router = express.Router();
const userController = require('./controllers/user');



app.get('/', (req, res) => {
    return res.json({ success: true });
});

// Route to handle user login
router.post('/login', userController.login);

// Route to handle user registration
router.post('/register', userController.register);

// Route to handle user logout
router.get('/logout', userController.logout);

// Use the middleware function for protecting sensitive routes
app.get('/dashboard', userController.requireAuth, (req, res) => {
    res.render('dashboard');
});




io.on('connection', socket => {
    console.log('connection');
});

io.on('disconnect', socket =>{
   console.log('disconnect');
});

server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});