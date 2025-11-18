// controllers/paymentController.js
const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const JobCard = require('../models/JobCard');
const Order = require('../models/Order'); // might be used in order payment flow
const logger = require('../config/logger');
const PaymentService = require('../services/paymentService');
const Notification = require('../models/Notification');
const StoreItem = require('../models/StoreItem');

/**
 * PROCESS JOB CARD PAYMENT
 * POST /api/payments/jobcard
 * Authenticated users
 */
const processJobCardPayment = asyncHandler(async (req, res) => {
    const {
        jobCardId,
        amount,
        currency = 'AED',
        paymentMethod = 'credit_card',
        cardToken, // optional
        metadata = {}
    } = req.body;

    // Validate input
    if (!jobCardId) {
        return res.status(400).json({ success: false, message: 'jobCardId is required' });
    }

    // Find job card and populate customerId
    const jobCard = await JobCard.findById(jobCardId).populate('customerId');
    if (!jobCard) {
        return res.status(404).json({ success: false, message: 'Job card not found' });
    }

    // Permission: ensure user either owns the jobCard or has rights (basic check)
    // Tests assume the logged-in user is the truck owner so we allow truck owners to pay for their jobcards.
    if (req.user && (req.user.role === 'general' || req.user.role === 'truck_owner')) {
        if (jobCard.customerId._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to pay for this job card' });
        }
    }

    try {
        // Determine payment amount (fallback to estimatedCost)
        const paymentAmount = typeof amount === 'number' && amount >= 0 ? amount : jobCard.estimatedCost;

        // Call your payment service (gateway integration lives there)
        const paymentResult = await PaymentService.processPayment({
            amount: paymentAmount,
            currency,
            paymentMethod,
            // We'll persist jobCardId & customerId in the Payment model (which exists)
            jobCardId: jobCardId,
            customerId: jobCard.customerId._id,
            cardToken,
            metadata: {
                ...metadata,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                processedBy: req.user?.id
            }
        });

        // Create a Payment record in DB (store essential fields that are present in your model)
        const createdPayment = await Payment.create({
            transactionId: paymentResult?.transactionId || undefined,
            jobCardId: jobCardId,
            customerId: jobCard.customerId._id,
            amount: paymentAmount,
            tax: paymentResult?.tax ?? 0,
            discount: paymentResult?.discount ?? 0,
            grandTotal: paymentResult?.grandTotal ?? paymentAmount,
            currency,
            paymentMethod: paymentMethod,
            paymentStatus: paymentResult?.status || 'completed', // trust service or default to completed if service returns it
            gatewayResponse: paymentResult?.gatewayResponse || {},
            cardInfo: paymentResult?.cardInfo || {},
            processedAt: paymentResult?.processedAt || new Date(),
            notes: paymentResult?.notes || ''
        });

        // Update jobCard status if payment succeeded (use service status)
        if ((paymentResult?.status || 'completed') === 'completed') {
            jobCard.status = 'completed';
            await jobCard.save();
        }

        // Notify customer
        if (jobCard.customerId && jobCard.customerId._id) {
            await Notification.createNotification(
                jobCard.customerId._id,
                `Payment of ${createdPayment.grandTotal} ${createdPayment.currency} processed for job card #${jobCard._id}`
            );
        }

        return res.status(201).json({
            success: true,
            data: {
                payment: createdPayment,
                serviceResponse: paymentResult
            },
            message: 'Payment processed successfully'
        });
    } catch (error) {
        logger.error('Job card payment processing error', {
            error: error.message,
            jobCardId,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PROCESS ORDER PAYMENT
 * POST /api/payments/order
 * Authenticated users
 */
const processOrderPayment = asyncHandler(async (req, res) => {
    const { orderId, paymentMethod = 'credit_card', cardToken, metadata = {} } = req.body;

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Permission: only the user who created order can pay
    if (req.user.id !== order.userId._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to pay for this order' });
    }

    if (order.status !== 'pending_payment') {
        return res.status(400).json({ success: false, message: 'Order payment already processed' });
    }

    try {
        const paymentResult = await PaymentService.processPayment({
            amount: order.totalAmount,
            currency: order.currency || 'AED',
            paymentMethod,
            orderId,
            customerId: order.userId._id,
            cardToken,
            metadata: {
                ...metadata,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                processedBy: req.user?.id
            }
        });

        // Persist payment with order linkage — we're using existing Payment fields:
        const createdPayment = await Payment.create({
            transactionId: paymentResult?.transactionId || undefined,
            jobCardId: null,
            customerId: order.userId._id,
            amount: order.totalAmount,
            tax: paymentResult?.tax ?? 0,
            discount: paymentResult?.discount ?? 0,
            grandTotal: paymentResult?.grandTotal ?? order.totalAmount,
            currency: order.currency || 'AED',
            paymentMethod,
            paymentStatus: paymentResult?.status || 'completed',
            gatewayResponse: paymentResult?.gatewayResponse || {},
            cardInfo: paymentResult?.cardInfo || {},
            processedAt: paymentResult?.processedAt || new Date(),
            notes: paymentResult?.notes || ''
        });

        // Update stock & order status if payment completed
        if ((paymentResult?.status || 'completed') === 'completed') {
            for (const item of order.items || []) {
                await StoreItem.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
            }
            order.status = 'paid';
            order.paymentId = createdPayment._id;
            await order.save();
        }

        // Send notification
        await Notification.createNotification(order.userId._id, `Payment of ${createdPayment.grandTotal} AED processed for order #${order._id}`);

        return res.status(200).json({
            success: true,
            data: { payment: createdPayment, serviceResponse: paymentResult },
            message: 'Payment processed successfully'
        });
    } catch (error) {
        logger.error('Order payment processing error', { error: error.message, orderId, userId: req.user?.id });
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET PAYMENT HISTORY
 * GET /api/payments
 * Authenticated users (admins can view all)
 */
const getPaymentHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, method, dateFrom, dateTo, minAmount, maxAmount } = req.query;
    const skip = (page - 1) * limit;

    // Base query
    const baseQuery = {};

    // Role-based access: general & truck_owner see only their payments
    if (req.user.role === 'general' || req.user.role === 'truck_owner') {
        // Find jobcards owned by this user
        const userJobCards = await JobCard.find({ customerId: req.user.id }).select('_id');
        baseQuery.$or = [
            { jobCardId: { $in: userJobCards.map(jc => jc._id) } },
            { customerId: req.user.id }
        ];
    }

    if (status) baseQuery.paymentStatus = status;
    if (method) baseQuery.paymentMethod = method;

    if (dateFrom || dateTo) {
        baseQuery.createdAt = {};
        if (dateFrom) baseQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) baseQuery.createdAt.$lte = new Date(dateTo);
    }

    if (minAmount || maxAmount) {
        baseQuery.grandTotal = {};
        if (minAmount) baseQuery.grandTotal.$gte = parseFloat(minAmount);
        if (maxAmount) baseQuery.grandTotal.$lte = parseFloat(maxAmount);
    }

    // Execute query
    const [payments, totalPayments] = await Promise.all([
        Payment.find(baseQuery)
            .populate({
                path: 'jobCardId',
                select: 'truckId status entryDate customerId',
                populate: { path: 'customerId', select: 'name email phone' }
            })
            .populate({ path: 'customerId', select: 'name email phone' })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip)),
        Payment.countDocuments(baseQuery)
    ]);

    return res.status(200).json({
        success: true,
        data: {
            payments,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalPayments / limit),
                totalPayments,
                limit: Number(limit)
            }
        }
    });
});

/**
 * GET PAYMENT BY ID
 * GET /api/payments/:id
 * Authenticated users
 */
const getPaymentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payment = await Payment.findById(id)
        .populate({
            path: 'jobCardId',
            populate: {
                path: 'customerId',
                select: 'name email phone'
            }
        })
        .populate({ path: 'customerId', select: 'name email phone' });

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Permission: general/truck_owner can only view their own payments
    if (req.user.role === 'general' || req.user.role === 'truck_owner') {
        // Use jobCard customer relation if available, fallback to payment.customerId
        const ownerId = payment.jobCardId?.customerId?._id?.toString() || payment.customerId?._id?.toString();
        if (ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this payment' });
        }
    }

    return res.status(200).json({ success: true, data: payment });
});

/**
 * INITIATE REFUND (basic)
 * POST /api/payments/:id/refund
 * Admin/Employee only (assumes middleware ensures this)
 *
 * Note: This implements refund bookkeeping on the existing Payment model fields.
 * If you want advanced gateway refunds (Stripe/PayPal), integrate with PaymentService.processRefund.
 */
const refundPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(id).populate('jobCardId').populate('customerId');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (payment.paymentStatus !== 'completed') {
        return res.status(400).json({ success: false, message: 'Only completed payments can be refunded' });
    }

    const refundAmount = amount || payment.grandTotal;
    if (refundAmount > payment.grandTotal) {
        return res.status(400).json({ success: false, message: 'Refund amount cannot exceed original payment' });
    }

    try {
        // Use payment service for actual gateway refund if available
        let refundResult = null;
        if (PaymentService && typeof PaymentService.processRefund === 'function') {
            try {
                refundResult = await PaymentService.processRefund({
                    paymentId: payment._id,
                    amount: refundAmount,
                    reason
                });
            } catch (err) {
                logger.warn('PaymentService refund error', { err: err.message });
                // continue to update local record even if gateway refund failed (depends on your desired behavior)
            }
        }

        // Update local payment record: reuse existing fields (refundedAt, notes, paymentStatus)
        payment.refundedAt = new Date();
        payment.paymentStatus = 'refunded';
        payment.notes = (payment.notes || '') + ` | Refund: ${refundAmount} - ${reason || 'no reason provided'}`;

        await payment.save();

        // Update jobCard or order status if present
        if (payment.jobCardId) {
            const jc = await JobCard.findById(payment.jobCardId._id);
            if (jc) {
                jc.status = (refundAmount === payment.grandTotal) ? 'archived' : jc.status;
                await jc.save();
            }
        }

        // Notify customer
        const targetCustomer = payment.customerId || payment.jobCardId?.customerId;
        if (targetCustomer) {
            await Notification.createNotification(
                targetCustomer._id || targetCustomer,
                `A refund of ${refundAmount} ${payment.currency || 'AED'} has been processed. Reason: ${reason || 'N/A'}`
            );
        }

        return res.status(200).json({ success: true, data: payment, message: 'Refund processed (local record) successfully' });
    } catch (error) {
        logger.error('Refund processing error', { error: error.message, paymentId: id });
        return res.status(500).json({ success: false, message: 'Refund processing failed', error: error.message });
    }
});

/**
 * GET PAYMENT ANALYTICS (basic)
 * GET /api/payments/analytics
 * Admin/Employee only
 */
const getPaymentAnalytics = asyncHandler(async (req, res) => {
    // Only admin/employee (caller should be protected by middleware)
    if (!['admin', 'employee'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { period = '30d', groupBy = 'day' } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    if (period === '7d') startDate.setDate(endDate.getDate() - 7);
    else if (period === '30d') startDate.setDate(endDate.getDate() - 30);
    else if (period === '90d') startDate.setDate(endDate.getDate() - 90);
    else if (period === '1y') startDate.setFullYear(endDate.getFullYear() - 1);
    else startDate.setDate(endDate.getDate() - 30);

    // Build basic aggregation: totals by status and by payment method
    const match = { createdAt: { $gte: startDate, $lte: endDate } };

    const [overview] = await Payment.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$grandTotal' },
                totalTransactions: { $sum: 1 },
                avgTransactionValue: { $avg: '$grandTotal' },
                completedPayments: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] } },
                pendingPayments: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } }
            }
        }
    ]);

    const byMethod = await Payment.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        { $sort: { revenue: -1 } }
    ]);

    return res.status(200).json({
        success: true,
        data: {
            period,
            overview: overview || {},
            byMethod
        }
    });
});

/**
 * PAYMENT WEBHOOK HANDLER (simplified)
 * POST /api/payments/webhook
 * Called by the payment gateway
 */
const webhookPaymentHandler = asyncHandler(async (req, res) => {
    const event = req.body;

    try {
        // Example: event should contain an identifier to find the payment
        // We attempt to match by transactionId, or gatewayTransactionId within gatewayResponse
        let payment = null;
        if (event?.transactionId) {
            payment = await Payment.findOne({ transactionId: event.transactionId });
        }
        if (!payment && event?.data?.object?.id) {
            const gatewayId = event.data.object.id;
            payment = await Payment.findOne({ 'gatewayResponse.gatewayTransactionId': gatewayId });
        }

        if (!payment) {
            logger.warn('Webhook received for unknown payment', { event });
            return res.status(200).json({ success: true, message: 'Event received but no matching payment' });
        }

        // Process common event types (gateway-specific mapping required)
        // Example: mark completed
        if (event.type === 'payment_succeeded' || event.type === 'payment_intent.succeeded') {
            payment.paymentStatus = 'completed';
            payment.processedAt = new Date();
            await payment.save();

            // Update jobcard if present
            if (payment.jobCardId) {
                const jc = await JobCard.findById(payment.jobCardId);
                if (jc) {
                    jc.status = 'completed';
                    await jc.save();
                }
            }
        } else if (event.type === 'payment_failed' || event.type === 'payment_intent.payment_failed') {
            payment.paymentStatus = 'failed';
            await payment.save();
        } else if (event.type === 'charge.refunded' || event.type === 'refund.succeeded') {
            payment.paymentStatus = 'refunded';
            payment.refundedAt = new Date();
            await payment.save();
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        logger.error('Webhook processing failed', { error: err.message, event });
        return res.status(500).json({ success: false });
    }
});

module.exports = {
    processJobCardPayment,
    processOrderPayment,
    getPaymentHistory,
    getPaymentById,
    refundPayment,
    getPaymentAnalytics,
    webhookPaymentHandler
};