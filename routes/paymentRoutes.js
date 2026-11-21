// routes/paymentRoutes.js
const express = require('express');
const {
  processJobCardPayment,
  processOrderPayment,
  processInvoicePayment,
  getPaymentHistory,
  getPaymentById,
  refundPayment,
  getPaymentAnalytics,
  webhookPaymentHandler,
  createPayment,
} = require('../controllers/paymentController');

const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateWebhookSignature } = require('../middleware/webhookMiddleware');

const router = express.Router();

/* -------------------------------------------
   PAYMENT CREATION ROUTES
-------------------------------------------- */

// JobCard payment
router.post('/jobcard', authMiddleware, processJobCardPayment);

// Order payment (store purchase)
router.post('/order', authMiddleware, processOrderPayment);

// Invoice payment
router.post('/invoice', authMiddleware, processInvoicePayment);

// GET PAYMENT INTENT
router.post('/create-intent', authMiddleware, createPayment);

// WEBHOOK (NO AUTH)
router.post('/webhook', validateWebhookSignature, webhookPaymentHandler);

// PAYMENT ANALYTICS (ADMIN / EMPLOYEE)
router.get('/analytics', authMiddleware, roleMiddleware(['admin', 'employee']), getPaymentAnalytics);

// PAYMENT HISTORY
router.get('/', authMiddleware, getPaymentHistory);

// REFUND ENDPOINT
router.post('/:id/refund', authMiddleware, roleMiddleware(['admin', 'employee']), refundPayment);

// GET SINGLE PAYMENT
router.get('/:id', authMiddleware, getPaymentById);

module.exports = router;