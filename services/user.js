const User = require('../schemas/user');
const { handleErrorMessages } = require('../helpers')

class UserService {
    static async createUser(userInfo) {
        try {
            const user = await new User(userInfo).save();
            return { success: true, user: user.toDisplay() };
        } catch (err) {
            const errorFields = ['username', 'mail', 'dob', 'password'];
            return { success: false, message: handleErrorMessages(err.errors, errorFields) };
        }
    }

    static async findUserByMail(mail) {
        return await User.findOne({ mail }).exec();
    }
}

module.exports = UserService;