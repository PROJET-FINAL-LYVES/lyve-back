const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name cannot be empty'],
        validator: function (name) {
            return this.model('Room').findOne({name}).then(room => !room);
        },
        message: () => 'Room name already taken'
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
}, { timestamps: true });

module.exports = Room = mongoose.model('Room', RoomSchema);
