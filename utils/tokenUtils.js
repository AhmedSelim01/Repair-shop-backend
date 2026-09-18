// --- utils/tokenUtils.js ---
const jwt = require('jsonwebtoken');

module.exports.generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
};

module.exports.verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports.decodeToken = (token) => {
    return jwt.decode(token);
};