const UserService = require('../services/user');
const bcrypt = require('bcrypt');

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

        return res.json({ success: true, user: user.toDisplay() });
    }

    static async register(req, res) {
        const {
            username,
            mail,
            gender,
            dob,
            newsletter,
            data_sharing,
            password,
            password_confirm
        } = req.body;

        const role = req.body.is_artist ? 'artist' : 'user';

        // check passwords match
        if (password !== password_confirm) {
            return res.json({ success: false, message: 'Passwords do not match.' });
        }

        const response = await UserService.createUser({ username, mail, gender, dob, role, newsletter, data_sharing, password });
        return res.json(response);
    }
}

module.exports = UserController;