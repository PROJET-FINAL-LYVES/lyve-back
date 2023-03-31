const SALT_ROUNDS = 10;

const USER_ROLES = ['user', 'artist', 'admin'];
const USER_GENDERS = ['male', 'female', 'other'];
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const MAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

module.exports = {
    SALT_ROUNDS,
    USER_ROLES,
    USER_GENDERS,
    MAIL_REGEX,
    USERNAME_MIN_LENGTH,
    USERNAME_MAX_LENGTH
};