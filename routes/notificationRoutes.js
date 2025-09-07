
const express = require('express');
const {
    createNotification,
    getUserNotifications,
    markNotificationsAsRead,
    deleteNotifications,
    getNotificationAnalytics,
    broadcastNotification
} = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a smart notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [general, security, payment, system, maintenance]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [app, email, sms]
 *     responses:
 *       201:
 *         description: Notification created successfully
 */
router.post('/', authMiddleware, createNotification);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications with advanced filtering
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/', authMiddleware, getUserNotifications);

/**
 * @swagger
 * /api/notifications/mark-read:
 *   put:
 *     summary: Mark notifications as read (bulk operation)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               markAll:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.put('/mark-read', authMiddleware, markNotificationsAsRead);

/**
 * @swagger
 * /api/notifications:
 *   delete:
 *     summary: Delete notifications (bulk operation)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications deleted successfully
 */
router.delete('/', authMiddleware, deleteNotifications);

/**
 * @swagger
 * /api/notifications/analytics:
 *   get:
 *     summary: Get notification analytics
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get('/analytics', authMiddleware, getNotificationAnalytics);

/**
 * @swagger
 * /api/notifications/broadcast:
 *   post:
 *     summary: Broadcast notification to multiple users
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Broadcast sent successfully
 */
router.post('/broadcast', authMiddleware, roleMiddleware(['admin']), broadcastNotification);

module.exports = router;
