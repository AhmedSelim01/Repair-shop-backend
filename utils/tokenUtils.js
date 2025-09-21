const jwt = require('jsonwebtoken');

// Generate a token (for authentication)
const generateAuthToken = (userId, role) => {
    return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
};

// Generate a token (for password reset)
const generateResetToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '15m',
    });
};

// Verify a token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token', error);
    }
};

// Decode a token
const decodeToken = (token) => {
    try {
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded) {
            throw new Error('Invalid token');
        }
        return decoded.payload;
    } catch (error) {
        throw new Error('Failed to decode token: ' + error.message);
    }
};

module.exports = {
    generateAuthToken,
    generateResetToken,
    verifyToken,
    decodeToken,
};