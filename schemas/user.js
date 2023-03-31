const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
//const { SALT_ROUNDS } = require('../constants/app');


const UserSchema = new mongoose.Schema({
    google:{
        id: {
            type: String,
        },
        name: {
            type: String,
        },
        email: {
            type: String,
        },

    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    mail: {
        type: String,
        required: true,
        unique: true
    },
    dob: {
        type: Date,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    lastLogin: {
        type: Date
    }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
    const user = this;

    if (this.isModified('password') || this.isNew) {
        user.password = await bcrypt.hash(user.password, 10);
        return next();
    }

    return next();
});

module.exports = User = mongoose.model('User', UserSchema);