const express = require('express');
const {
  processPayment,
  getPaymentHistory,
  getPaymentById,
  refundPayment,
  getPaymentAnalytics,
  webhookPaymentHandler
} = require('../controllers/paymentController');
const { authMiddleware} = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateWebhookSignature } = require('../middleware/webhookMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - amount
 *         - currency
 *         - email
 *         - jobCardId
 *         - paymentMethodDetails
 *       properties:
 *         idempotencyKey:
 *           type: string
 *           description: Unique key to prevent duplicate payments
 *         amount:
 *           type: number
 *           format: double
 *           minimum: 0.01
 *           example: 99.99
 *         currency:
 *           type: string
 *           enum: [USD, EUR, GBP]
 *           default: USD
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         jobCardId:
 *           type: string
 *           pattern: '^[a-f\d]{24}$'
 *           example: 507f1f77bcf86cd799439011
 *         paymentMethodDetails:
 *           type: object
 *           required:
 *             - type
 *           properties:
 *             type:
 *               type: string
 *               enum: [credit_card, debit_card, bank_transfer, digital_wallet]
 *             last4:
 *               type: string
 *               pattern: '^\d{4}$'
 *               example: "4242"
 *             brand:
 *               type: string
 *               example: "visa"
 *         metadata:
 *           type: object
 *           additionalProperties: true
 */

/**
 * @swagger
 * /api/payments/process:
 *   post:
 *     summary: Process a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Payment'
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paymentIntent:
 *                   type: object
 *                 clientSecret:
 *                   type: string
 *                   description: Client-side payment confirmation key
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate payment (idempotency key conflict)
 *       500:
 *         description: Server error
 */
router.post('/process', authMiddleware, async (req, res) => {
  const { amount, currency, email, jobCardId, paymentMethodDetails, idempotencyKey } = req.body;

  // Enhanced validation
  if (!amount || amount <= 0 || 
      !currency || !['USD', 'EUR', 'GBP'].includes(currency) ||
      !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !jobCardId || !/^[a-f\d]{24}$/.test(jobCardId) ||
      !paymentMethodDetails?.type) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid payment data',
      details: {
        amount: 'Must be positive number',
        currency: 'Must be USD, EUR, or GBP',
        email: 'Must be valid email',
        jobCardId: 'Must be 24-character hex ID',
        paymentMethod: 'Must include type'
      }
    });
  }

  try {
    const result = await processPayment({
      amount,
      currency,
      email,
      jobCardId,
      paymentMethodDetails,
      idempotencyKey,
      metadata: req.body.metadata || {}
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ 
      success: false, 
      error: error.code || 'payment_error',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get paginated payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *     responses:
 *       200:
 *         description: Payment history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
router.get('/history', authMiddleware, getPaymentHistory);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-f\d]{24}$'
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 */
router.get('/:id', authMiddleware, getPaymentById);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Initiate refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-f\d]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               reason:
 *                 type: string
 *                 minLength: 10
 *               idempotencyKey:
 *                 type: string
 *     responses:
 *       202:
 *         description: Refund initiated
 *       400:
 *         description: Invalid refund request
 */
router.post('/:id/refund', authMiddleware, roleMiddleware(['admin', 'employee']), refundPayment);

/**
 * @swagger
 * /api/payments/analytics:
 *   get:
 *     summary: Get payment analytics
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year, custom]
 *           default: month
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalVolume:
 *                   type: number
 *                 successfulPayments:
 *                   type: integer
 *                 refundRate:
 *                   type: number
 *                 methods:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 */
router.get('/analytics', authMiddleware, roleMiddleware(['admin', 'employee']), getPaymentAnalytics);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Payment webhook handler
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [payment_succeeded, payment_failed, refund_processed]
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *       400:
 *         description: Invalid webhook payload
 *       401:
 *         description: Invalid signature
 */
router.post('/webhook', validateWebhookSignature, webhookPaymentHandler);

module.exports = router;