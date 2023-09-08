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

const verifyJsonWebToken = (req, res, next) => {
    const authorizationToken = req.headers.authorization;
    if (!authorizationToken) {
        return res.status(403).json({ message: 'Forbidden access' });
    }

    try {
        req.user = jwt.verify(authorizationToken, process.env.JWT_SECRET);
        console.log(req.user);
        next();
    } catch (e) {
        if (e instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Unauthorized access' });
        }

        return res.status(400).json({ message: 'Invalid token' });
    }
};

const generateRandomString = (length = 10) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(length)].reduce(a => a + characters[~~(Math.random() * characters.length)], '');
};

module.exports = {
    handleErrorMessages,
    createJsonWebToken,
    verifyJsonWebToken,
    generateRandomString
}