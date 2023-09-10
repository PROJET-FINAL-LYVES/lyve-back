const START_VIDEO_EVENT = 'start video';
const MESSAGE_EVENT = 'chat message';
const ADD_VIDEO_EVENT = 'add video';

// rooms
const CREATE_ROOM_EVENT = 'create room';
const JOIN_ROOM_EVENT = 'join room v2'; // TODO: update to normal event afterwards
const LEAVE_ROOM_EVENT = 'leave room';
const DELETE_ROOM_EVENT = 'delete room';
const GET_ROOMS_EVENT = 'get rooms';

// messages
const NEW_MESSAGE_EVENT = 'message';

// songs
const ADD_SONG_EVENT = 'add song';

module.exports = {
    START_VIDEO_EVENT,
    MESSAGE_EVENT,
    ADD_VIDEO_EVENT,
    CREATE_ROOM_EVENT,
    JOIN_ROOM_EVENT,
    LEAVE_ROOM_EVENT,
    DELETE_ROOM_EVENT,
    GET_ROOMS_EVENT,

    ADD_SONG_EVENT,

    NEW_MESSAGE_EVENT
};