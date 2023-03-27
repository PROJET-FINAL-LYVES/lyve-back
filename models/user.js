const mongoose = require('mongoose');
const { UserSchema } = require('../schemas/user');
const bcrypt = require( 'bcrypt' );
const { SALT_ROUNDS } = require('../constants/app');

class UserModel {
    initSchema() {
        UserSchema.pre('save', async function(next) {
            const user = this;
            if (this.isModified('password') || this.isNew) {
                user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
                return next();
            }
            return next();
        });

        mongoose.model('user', UserSchema);
    }
    getInstance() {
        this.initSchema();
        return mongoose.model('user');
    }
    async createUser(username, password, mail, dob) {
        const UserModel = this.getInstance();
        const user = new UserModel({ username, password ,mail ,dob});
        try {
            await user.save();
            console.log('New user created successfully');
        } catch (err) {
            console.error('Error creating new user:', err);
        }
    }

}