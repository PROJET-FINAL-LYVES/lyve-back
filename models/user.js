const mongoose = require('mongoose');
const { UserSchema } = require('../schemas/user');
const bcrypt = require( 'bcrypt' );
const { SALT_ROUNDS } = require('../constants/app');

class UserModel {
    initSchema() {
        // before saving user
        UserSchema.pre('save', async function(next) {
            const user = this;

            // only hash password when it's modified
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

}