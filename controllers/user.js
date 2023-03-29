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
        try {
            const { username, mail, dob, password, password_confirm } = req.body;
            // Validation des données du formulaire
            if (!username || !mail || !dob || !password ) {
                return res.status(400).json({ error: "Tous les champs sont obligatoires" });
            }

            // Vérification du format de l'adresse e-mail
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(mail)) {
                return res.status(400).json({ error: "Adresse e-mail invalide" });
            }

            // check unique mail + unique username
            const existingUserByEmail = await UserService.findUserByMail(mail);
            if (existingUserByEmail) {
                return res.json({ success: false, message: 'Email already in use.' });
            }

            const existingUserByUsername = await UserService.findUserByUsername(username);
            if (existingUserByUsername) {
                return res.json({ success: false, message: 'Username already in use.' });
            }

            // check passwords match
            if (password !== password_confirm) {
                return res.json({ success: false, message: 'Passwords do not match.' });
            }

            const user = await UserService.createUser({ username, mail, dob, password });
            res.status(201).json({ user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async requireAuth(req, res, next) {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
        next();
    };
}

module.exports = UserController;