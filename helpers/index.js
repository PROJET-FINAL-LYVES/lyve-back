const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN } = require('../constants/app');

const handleErrorMessages = (errors, fields) => {
    const errorMessages = [];

    fields.forEach(field => {
        if (errors[field]) errorMessages.push(errors[field].message);
    });

    return errorMessages;
}

const createJsonWebToken = user => {
    return jwt.sign(user, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: JWT_EXPIRES_IN
    });
};

const verifyJsonWebToken = token => {
    try {
        const tokenData = jwt.verify(token, process.env.JWT_SECRET);
        return { success: true, tokenData };
    } catch (e) {
        if (e instanceof jwt.JsonWebTokenError) {
            return { error: 'Unauthorized access.' };
        }

        return { error: 'Invalid token.' };
    }
};

const generateRandomString = (length = 10) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(length)].reduce(a => a + characters[~~(Math.random() * characters.length)], '');
};

const getVideoIdFromUrl = url => {
    let referenceUrl;

    try {
        referenceUrl = new URL(url);
    } catch (error) {
        return false;
    }

    if (
        ['http:', 'https:'].includes(referenceUrl.protocol) &&
        ['www.youtube.com', 'youtube.com'].includes(referenceUrl.hostname) &&
        referenceUrl.searchParams.get('v').length === 11
    ) {
        return referenceUrl.searchParams.get('v');
    }

    return false;
};

module.exports = {
    handleErrorMessages,
    createJsonWebToken,
    verifyJsonWebToken,
    generateRandomString,
    getVideoIdFromUrl
}