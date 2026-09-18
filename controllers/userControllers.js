// controllers/userController.js
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Truck = require('../models/Truck');
const Company = require('../models/Company');

/**
 * GET /api/users
 * Admins & employees only
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const requester = req.user;
  if (!['admin', 'employee'].includes(requester.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const search = req.query.search?.trim();
  const roleFilter = req.query.role;

  const query = { isDeleted: false };
  if (search) {
    const re = new RegExp(search, 'i');
    query.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  if (roleFilter) query.role = roleFilter;

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password -resetCode -resetCodeExpires')
    .populate('companyId', 'companyName') // companyName kept per your choice
    .populate('trucks', 'licensePlate brand model')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    success: true,
    metadata: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    data: users.map(u => u.getPublicProfile ? u.getPublicProfile() : u)
  });
});

/**
 * GET /api/users/me
 * Authenticated user gets own public profile
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -resetCode -resetCodeExpires')
    .populate('companyId', 'companyName')
    .populate('trucks', 'licensePlate brand model');

  if (!user || user.isDeleted) return res.status(404).json({ success: false, message: 'User not found' });

  return res.status(200).json({ success: true, data: user.getPublicProfile() });
});

/**
 * GET /api/users/:id
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requester = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid user ID' });

  const user = await User.findById(id)
    .select('-password -resetCode -resetCodeExpires')
    .populate('companyId', 'companyName')
    .populate('trucks', 'licensePlate brand model');

  if (!user || user.isDeleted) return res.status(404).json({ success: false, message: 'User not found' });

  // Authorization rules:
  const isAdmin = requester.role === 'admin';
  const isSelf = requester._id.equals(user._id);
  const isCompanyPeer = requester.role === 'company' && requester.companyId?.toString() === user.companyId?.toString();

  if (isAdmin || isSelf || isCompanyPeer) {
    return res.status(200).json({ success: true, data: user.getPublicProfile() });
  }

  if (requester.role === 'employee') {
    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        role: user.role,
        trucks: user.trucks,
        companyId: user.companyId
      }
    });
  }

  return res.status(403).json({ success: false, message: 'Forbidden' });
});

/**
 * PUT /api/users/:id
 * Only admin or the user themself.
 * Block changing sensitive fields unless admin.
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requester = req.user;
  const payload = { ...req.body };

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid user ID' });

  const user = await User.findById(id);
  if (!user || user.isDeleted) return res.status(404).json({ success: false, message: 'User not found' });

  if (!(requester.role === 'admin' || requester._id.equals(user._id))) return res.status(403).json({ success: false, message: 'Forbidden' });

  // Remove forbidden fields for non-admins
  delete payload.resetCode;
  delete payload.resetCodeExpires;
  if (payload.role && requester.role !== 'admin') delete payload.role;

  // Block overreaching updates (only admin can change these)
  if (requester.role !== 'admin') {
    delete payload.isActive;
    delete payload.isDeleted;
    delete payload.trucks;
    delete payload.companyId;
  }

  Object.assign(user, payload);
  await user.save();

  res.status(200).json({ success: true, message: 'User updated', data: user.getPublicProfile() });
});

/**
 * DELETE /api/users/:id (soft delete)
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requester = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid user ID' });
  if (requester.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.isDeleted = true;
  await user.save();

  res.status(200).json({ success: true, message: 'User soft-deleted', data: { _id: user._id } });
});