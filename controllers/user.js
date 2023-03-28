const UserService = require("../services/user");
const bcrypt = require("bcrypt");

class UserController {
    static async login(req, res) {
        const { mail, password } = req.body;

        const user = await UserService.findUserByMail(mail);
        if (!user) {
            return res.json({ success: false, message: 'Mail is not linked to an account' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.json({ success: false, message: 'Invalid password' });
        }

        // TODO: update session
        // req.session.userId = user._id;

        return res.json({ success: true });
    }

    static async logout(req, res) {
        req.session.destroy();
        res.redirect('/login');
    }

    static async register(req, res) {
        const { username, mail, dob, password, password_confirm } = req.body;

        // TODO: check unique mail + unique username

        // check passwords match
        if (password !== password_confirm) {
            return res.json({ success: false, message: 'Passwords do not match.' });
        }

        const user = await UserService.createUser({ username, mail, dob, password });
        return res.json(user);
    }

    static async requireAuth(req, res, next) {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
        next();
    };
}

module.exports = UserController;