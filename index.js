require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const database = require('./database');

const app = express();
const port = process.env.APP_PORT;

const server = http.createServer(app);
const io = new Server(server);

const userController = require('./controllers/user');
const bcrypt = require("bcrypt");


app.get('/', (req, res) => {
    return res.json({ success: true });
});
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Find the user with the given email address
    const user = await User.findOne({ email });

    // If no user is found, return an error
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Check if the password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
    }

    // Create a new session for the user
    req.session.userId = user._id;

    // Redirect the user to the dashboard or any other page
    res.redirect('/dashboard');
});
app.post('/register', async (req, res) => {
    const { email, password ,username } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user in the database
    const user = new User({ email, password: hashedPassword ,username});
    await user.save();
});

const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Use the middleware function for protecting sensitive routes
app.get('/dashboard', requireAuth, (req, res) => {
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