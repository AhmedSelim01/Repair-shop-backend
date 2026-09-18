// controllers/authController.js
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passwordResetLimiter = require('../models/RateLimiter'); // assume exists
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// --------------------
// Helper functions
// --------------------
const isStrongPassword = (pw) => {
  if (!pw || typeof pw !== 'string') return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pw);
};

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      companyId: user.companyId || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const findUserByEmailOrPhone = async ({ email, phone }) => {
  return User.findOne({
    $or: [
      email ? { email: email.toLowerCase().trim() } : null,
      phone ? { phone } : null,
    ].filter(Boolean),
  });
};

// --------------------
// REGISTER USER
// --------------------
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'general' } = req.body;

  // Required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  // Email validation (FIX)
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format.',
    });
  }

  // Password strength
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
    });
  }

  // Unique checks
  if (await findUserByEmailOrPhone({ email })) {
    return res.status(409).json({
      success: false,
      message: 'Email already in use.',
    });
  }

  if (phone && (await findUserByEmailOrPhone({ phone }))) {
    return res.status(409).json({
      success: false,
      message: 'Phone already in use.',
    });
  }

  // Prevent unsafe role creation
  const safeRole = ['admin', 'employee'].includes(role) ? role : 'general';

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    phone,
    password,
    role: safeRole,
  });

  res.status(201).json({
    success: true,
    _id: user._id,
    email: user.email,
    role: user.role,
    token: generateToken(user),
    message: 'User registered successfully.',
  });
});

// --------------------
// LOGIN USER
// --------------------
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const user = await findUserByEmailOrPhone({ email });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  res.status(200).json({
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user),
  });
});

// --------------------
// REQUEST RESET CODE
// --------------------
exports.requestResetCode = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  try {
    await passwordResetLimiter.consume(req.ip);
  } catch {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Try again later.',
    });
  }

  if (!email && !phone) {
    return res.status(400).json({
      success: false,
      message: 'Email or phone is required.',
    });
  }

  const user = await findUserByEmailOrPhone({ email, phone });

  // Do not reveal account existence
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If the account exists, a reset code will be sent.',
    });
  }

  const resetCode = crypto.randomInt(100000, 999999).toString();

  user.resetCode = resetCode;
  user.resetCodeExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
  await user.save();

  console.info(
    `Password reset code for ${user.email || user.phone}: ${resetCode}`
  );

  res.status(200).json({
    success: true,
    message: 'If the account exists, a reset code will be sent.',
  });
});

// --------------------
// RESET PASSWORD
// --------------------
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, phone, resetCode, newPassword } = req.body;

  try {
    await passwordResetLimiter.consume(req.ip);
  } catch {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Try again later.',
    });
  }

  if (!resetCode || !newPassword || (!email && !phone)) {
    return res.status(400).json({
      success: false,
      message: 'resetCode, newPassword, and email or phone are required.',
    });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message:
        'New password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
    });
  }

  const user = await findUserByEmailOrPhone({ email, phone });

  if (
    !user ||
    !user.resetCode ||
    user.resetCode !== String(resetCode) ||
    user.resetCodeExpires < Date.now()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset code.',
    });
  }

  user.password = newPassword;
  user.resetCode = null;
  user.resetCodeExpires = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully.',
  });
});