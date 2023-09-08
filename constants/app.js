const SALT_ROUNDS = 10;

const USER_ROLES = ['user', 'artist', 'admin'];
const USER_GENDERS = ['male', 'female', 'other'];
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const ROOM_LIMIT = 10;
const MAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const MAX_ROOM_USERS_LIMIT = 99;

const JWT_EXPIRES_IN = '7d';

const MUSIC_TYPES = [
    'jazz',
    'rap',
    'classic',
    'rock',
    'hip-hop',
    'rnb',
    'dnb',
    'house'
    // TODO: add more plz :)
];

module.exports = {
    SALT_ROUNDS,
    USER_ROLES,
    USER_GENDERS,
    MAIL_REGEX,
    USERNAME_MIN_LENGTH,
    USERNAME_MAX_LENGTH,
    JWT_EXPIRES_IN,
    ROOM_LIMIT,
    MAX_ROOM_USERS_LIMIT,
    MUSIC_TYPES
};