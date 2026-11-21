// routes/orderRoutes.js
const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { getAllOrders, getOrderById, updateOrderStatus, deleteOrder } = require('../controllers/orderController');

router.get('/', authMiddleware, getAllOrders);
router.get('/:id', authMiddleware, getOrderById);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'employee']), updateOrderStatus);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteOrder);

module.exports = router;