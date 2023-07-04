const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { SALT_ROUNDS, USER_ROLES, USER_GENDERS, MAIL_REGEX, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } = require('../constants/app');

const { createJsonWebToken } = require('../helpers');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username cannot be empty'],
        minLength: [USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`],
        maxLength: [USERNAME_MAX_LENGTH, `Username must be at max ${USERNAME_MAX_LENGTH} characters`],
        validate: {
            validator: function(username) {
                return this.model('User').findOne({ username }).then(user => !user);
            },
            message: () => 'Username already taken'
        }
    },
    mail: {
        type: String,
        trim: true,
        required: [true, 'Mail address cannot be empty'],
        match: [MAIL_REGEX, 'Invalid mail address syntax'],
        validate: {
            validator: function(mail) {
                return this.model('User').findOne({ mail }).then(user => !user);
            },
            message: () => 'Mail address already in use'
        }
    },
    gender: {
        type: String,
        enum: USER_GENDERS,
        default: 'male',
        required: true
    },
    dob: {
        type: Date,
        required: [true, 'Date of birth cannot be empty']
    },
    role: {
        type: String,
        enum: USER_ROLES,
        default: 'user',
        required: true
    },
    newsletter: {
        type: Boolean
    },
    data_sharing: {
        type: Boolean
    },
    password: {
        type: String,
        required: [true, 'Password cannot be empty']
    },
    lastLogin: {
        type: Date
    }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
    const user = this;

    if (this.isModified('password') || this.isNew) {
        user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
        return next();
    }

    return next();
});

// method to return values after registration and login
UserSchema.method('toDisplay', function() {
    const { __v, _id, password, ...object } = this.toObject();
    const jwt = createJsonWebToken(object);

    return { ...object, token: jwt };
})

module.exports = User = mongoose.model('User', UserSchema);