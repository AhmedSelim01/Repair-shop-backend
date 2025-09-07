
const express = require('express');
const {
    getDashboardAnalytics,
    getUserManagement,
    bulkUserOperations,
    getSystemHealth
} = require('../controllers/adminPanelController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard analytics
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', authMiddleware, roleMiddleware(['admin']), getDashboardAnalytics);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get user management data with advanced filtering
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: User management data retrieved successfully
 */
router.get('/users', authMiddleware, roleMiddleware(['admin']), getUserManagement);

/**
 * @swagger
 * /api/admin/users/bulk:
 *   post:
 *     summary: Perform bulk operations on users
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operation:
 *                 type: string
 *                 enum: [activate, deactivate, delete, updateRole]
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Bulk operation completed successfully
 */
router.post('/users/bulk', authMiddleware, roleMiddleware(['admin']), bulkUserOperations);

/**
 * @swagger
 * /api/admin/system-health:
 *   get:
 *     summary: Get comprehensive system health metrics
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health metrics retrieved successfully
 */
router.get('/system-health', authMiddleware, roleMiddleware(['admin']), getSystemHealth);

module.exports = router;
