const jwt = require('jsonwebtoken'); // JWT token verification
const asyncHandler = require('express-async-handler'); // Async error handling
const User = require('../models/User'); // User model for database lookups
require('dotenv').config();

// Middleware to check authentication
exports.authMiddleware = asyncHandler(async (req, res, next) => {
    let token;

    // Check if Authorization header contains a Bearer token
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer') 
    ) {
        try {
            // Extract the token from the Authorization header
            token = req.headers.authorization.split(' ')[1];

            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user by ID from the decoded token
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                res.status(401);
                throw new Error('User not found. Unauthorized.');
            }

            // Proceed to the next middleware or route handler
            next();
        } catch (error) {
            // Handle specific JWT errors
            const message =
                error.name === 'TokenExpiredError'
                    ? 'Token expired. Please log in again.'
                    : 'Invalid token. Unauthorized.';
            res.status(401);
            throw new Error(message);
        }
    } else {
        res.status(401);
        throw new Error('No token provided. Unauthorized.');
    }
});