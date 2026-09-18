// routes/userRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');

const { getAllUsers, getUserById, updateUser, deleteUser, getMe } = require('../controllers/userControllers');

const router = express.Router();

// Admin & Employee - list users
router.get('/', authMiddleware, roleMiddleware(['admin', 'employee']), getAllUsers);

// Authenticated user - own profile
router.get('/me', authMiddleware, getMe);

// Any authenticated user - get profile by id
router.get('/:id', authMiddleware, validateObjectId, getUserById);

// Update (self or admin)
router.put('/:id', authMiddleware, validateObjectId, updateUser);

// Soft-delete (Admin only)
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), validateObjectId, deleteUser);

module.exports = router;