require('dotenv').config();

// dependencies
const mongoose = require("mongoose");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');

// initializations
const app = express();
const port = process.env.APP_PORT;
const server = http.createServer(app);
const io = new Server(server);
require('./services/PasseportConfigServices')(passport);

// controllers
const userController = require('./controllers/user');

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
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/dashboard');
});


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