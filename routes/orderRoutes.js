// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { checkoutCart, processOrderPayment } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

router.post('/checkout', protect, checkoutCart);
router.post('/:orderId/payment', protect, processOrderPayment);

module.exports = router;