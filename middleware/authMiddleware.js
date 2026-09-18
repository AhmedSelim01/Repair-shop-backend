// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  // Authorization header 'Bearer <token>'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Fallback: token in cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    return res.json({ success: false, message: 'No token provided. Unauthorized.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // exclude sensitive fields
    const user = await User.findById(decoded.id).select('-password -resetCode -resetCodeExpires');
    if (!user) {
      res.status(401);
      return res.json({ success: false, message: 'User not found. Unauthorized.' });
    }
    req.user = user;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expired. Please login again.'
      : 'Invalid token. Unauthorized.';
    res.status(401);
    return res.json({ success: false, message });
  }
});