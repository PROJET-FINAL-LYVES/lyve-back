const UserModel = require("../models/user");
const bcrypt = require("bcrypt");

class UserController {
    constructor(service) {
        this.service = service;
    }

    async create(req, res) {

    }
    static async login(req, res) {
        const { email, password } = req.body;

        // Find the user with the given email address
        const user = await UserModel.findOne({ email });

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
    }
    static async logout(req, res) {
        // Destroy the session
        req.session.destroy();

        // Redirect the user to the login page
        res.redirect('/login');
    }
    static async register(req, res) {
        const { email, password ,username } = req.body;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user in the database
        const user = new UserModel({ email, password: hashedPassword ,username});
        await user.save();
    }
    static async requireAuth(req, res, next) {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
        next();
    };
}

module.exports = UserController;