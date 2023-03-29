const User = require('../schemas/user');

class UserService {
    static async createUser({ username, mail, dob, password }) {
        const user = { username, mail, dob, password };
        return await new User(user).save();
    }

    static async findUserByUsername(username) {
        return await User.findOne({ username }).exec();
    }
    
    static async findUserByMail(mail) {
        return await User.findOne({ mail }).exec();
    }
}

module.exports = UserService;