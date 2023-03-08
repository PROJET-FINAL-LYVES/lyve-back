require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.APP_PORT;

const server = http.createServer(app);
const io = new Server(server);

const userController = require('./controllers/user');


app.get('/', (req, res) => {
    return res.json({ success: true });
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