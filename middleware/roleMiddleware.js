// middleware/roleMiddleware.js
const asyncHandler = require('express-async-handler');

exports.roleMiddleware = (allowedRoles, errorMessage = 'Access forbidden') => {
    return asyncHandler(async(req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ success: false, message: 'User information missing. Please log in.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: errorMessage });
        }
        next();
    });
};