
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

router.post('/', authMiddleware, createNotification);

router.get('/', authMiddleware, getUserNotifications);

router.put('/mark-read', authMiddleware, markNotificationsAsRead);

router.delete('/', authMiddleware, deleteNotifications);

router.get('/analytics', authMiddleware, getNotificationAnalytics);

router.post('/broadcast', authMiddleware, roleMiddleware(['admin']), broadcastNotification);

module.exports = router;