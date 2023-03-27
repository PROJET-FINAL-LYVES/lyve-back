const UserModel  = require("../models/user");
const bcrypt = require("bcrypt");
const { SALT_ROUNDS } = require('../constants/app');

class UserController {
    constructor(service) {
        this.service = service;
    }

    async create(req, res) {

    }
    static async login(req, res) {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        req.session.userId = user._id;
        res.redirect('/dashboard');
    }
    static async logout(req, res) {
        req.session.destroy();
        res.redirect('/login');
    }
    static async register(req, res) {
        const { username, password, email, dob } = req.body;
        const UserModel = new UserModel;
        const user = await UserModel.createUser(username, password, email, dob);
        }
    static async requireAuth(req, res, next) {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
        next();
    };
}

module.exports = UserController;