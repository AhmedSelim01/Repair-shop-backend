// routes/paymentRoutes.js
const express = require('express');
const {
  processJobCardPayment,
  processOrderPayment,
  getPaymentHistory,
  getPaymentById,
  refundPayment,
  getPaymentAnalytics,
  webhookPaymentHandler
} = require('../controllers/paymentController');

const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateWebhookSignature } = require('../middleware/webhookMiddleware');

const router = express.Router();

/* -------------------------------------------
   PAYMENT CREATION ROUTES
-------------------------------------------- */

// JobCard payment
router.post(
  '/jobcard',
  authMiddleware,
  processJobCardPayment
);

// Order payment (store purchase)
router.post(
  '/order',
  authMiddleware,
  processOrderPayment
);

/* -------------------------------------------
   WEBHOOK (NO AUTH)
-------------------------------------------- */
router.post(
  '/webhook',
  validateWebhookSignature,
  webhookPaymentHandler
);

/* -------------------------------------------
   PAYMENT ANALYTICS (ADMIN / EMPLOYEE)
-------------------------------------------- */
router.get(
  '/analytics',
  authMiddleware,
  roleMiddleware(['admin', 'employee']),
  getPaymentAnalytics
);

/* -------------------------------------------
   PAYMENT HISTORY FOR LOGGED-IN USER
   - Customers see their own payments
   - Admin/employee sees ALL
-------------------------------------------- */
router.get(
  '/',
  authMiddleware,
  getPaymentHistory
);

/* -------------------------------------------
   REFUND ENDPOINT
   Only admin + employee can refund
-------------------------------------------- */
router.post(
  '/:id/refund',
  authMiddleware,
  roleMiddleware(['admin', 'employee']),
  refundPayment
);

// GET SINGLE PAYMENT
router.get(
  '/:id',
  authMiddleware,
  getPaymentById
);

module.exports = router;