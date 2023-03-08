const { Schema } = require( 'mongoose' );

export const UserSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    mail: {
        type: String,
        required: true
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