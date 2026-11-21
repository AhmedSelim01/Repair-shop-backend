
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

router.get('/dashboard', authMiddleware, roleMiddleware(['admin']), getDashboardAnalytics);

router.get('/users', authMiddleware, roleMiddleware(['admin']), getUserManagement);

router.post('/users/bulk', authMiddleware, roleMiddleware(['admin']), bulkUserOperations);

router.get('/system-health', authMiddleware, roleMiddleware(['admin']), getSystemHealth);

module.exports = router;