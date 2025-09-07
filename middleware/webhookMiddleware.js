// middleware/webhookMiddleware.js
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Validates webhook signatures for payment processing
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Next middleware function
 */
const validateWebhookSignature = (req, res, next) => {
    try {
        // Get signature from headers
        const signature = req.headers['x-payment-signature'];
        
        if (!signature) {
            logger.warn('Webhook request missing signature header');
            return res.status(401).json({
                success: false,
                message: 'Missing signature header'
            });
        }

        // Create HMAC signature
        const secret = process.env.PAYMENT_WEBHOOK_SECRET;
        const hmac = crypto.createHmac('sha256', secret);
        const rawBody = JSON.stringify(req.body);
        const generatedSignature = hmac.update(rawBody).digest('hex');
        
        // Compare signatures
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(generatedSignature)
        );
        
        if (!isValid) {
            logger.warn('Invalid webhook signature', {
                received: signature,
                generated: generatedSignature
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
        }
        
        next();
    } catch (error) {
        logger.error('Webhook signature validation failed', {
            error: error.message,
            body: req.body
        });
        res.status(500).json({
            success: false,
            message: 'Webhook processing error'
        });
    }
};

module.exports = {
    validateWebhookSignature
};