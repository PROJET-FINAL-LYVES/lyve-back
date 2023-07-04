const mongoose = require('mongoose');

const URL_VALIDATOR_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

const VideoSchema = new mongoose.Schema({
    url: {
        type: String,
        required: [true, 'Video URL is mandatory'],
        validate: {
            validator: value => URL_VALIDATOR_REGEX.test(value),
            message: 'Invalid URL format'
        }
    },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Invalid user']
    },
    playlist: {
        type: String, // TODO: foreign relation with ObjectId and playlist table ?
        default: 'default'
    }
}, { timestamps: true });

module.exports = Video = mongoose.model('Video', VideoSchema);