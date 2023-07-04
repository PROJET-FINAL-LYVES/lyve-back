const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name cannot be empty'],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User cannot be empty'],
    },
    type: {
        type: String,
        enum: ['private', 'public'],
        default: 'private',
        required: [true, 'Type must be either private or public'],
    },
    max_people_inside: {
        type: Number,
        default: 12,
        validate: {
            validator: function(v) {
                return v <= 12;
            },
            message: props => `Max people inside should not be more than 12!`
        }
    },
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('Room', RoomSchema);
