const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const JobCard = require('../models/JobCard');
const logger = require('../config/logger');
const Order = require('../models/Order');
const PaymentService = require('../services/paymentService');
const Notification = require('../models/Notification');
const StoreItem = require('../models/StoreItem');

/**
 * PROCESS JOB CARD PAYMENT
 * @route POST /api/payments/jobcard
 * @access Authenticated users
 */
const processJobCardPayment = asyncHandler(async (req, res) => {
    const { 
        jobCardId, 
        amount, 
        currency = 'AED', 
        paymentMethod = 'credit_card',
        cardToken, // For credit card payments
        metadata = {},
    } = req.body;

    // Validate job card exists and user has permission
    const jobCard = await JobCard.findById(jobCardId).populate('customerId');
    if (!jobCard) {
        return res.status(404).json({
            success: false,
            message: 'Job card not found'
        });
    }

    // Permission check
    if (jobCard.customerId._id.toString() !== req.user.id && 
        !['admin', 'employee'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to process payment for this job card'
        });
    }

    try {
        // Process payment using the enhanced service
        const paymentResult = await PaymentService.processPayment({
            amount: amount || jobCard.estimatedCost,
            currency,
            paymentMethod,
            referenceType: 'jobCard',
            referenceId: jobCardId,
            customerId: jobCard.customerId._id,
            cardToken,
            metadata: {
                ...metadata,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                processedBy: req.user.id
            }
        });

        // Send notification
        await Notification.createNotification(
            jobCard.customerId._id,
            `Payment of ${amount} ${currency} processed for job card #${jobCard.jobCardNumber}`
        );

        res.status(201).json({
            success: true,
            data: paymentResult,
            message: 'Payment processed successfully'
        });

    } catch (error) {
        logger.error('Job card payment processing error', {
            error: error.message,
            jobCardId,
            userId: req.user.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PROCESS ORDER PAYMENT
 * @route POST /api/payments/order
 * @access Authenticated users
 */
const processOrderPayment = asyncHandler(async (req, res) => {
    const { 
        orderId, 
        paymentMethod = 'credit_card',
        cardToken, // For credit card payments
        metadata = {}
    } = req.body;

    // Validate order exists and belongs to user
    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    // Permission check
    if (order.userId._id.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to process payment for this order'
        });
    }

    if (order.status !== 'pending_payment') {
        return res.status(400).json({
            success: false,
            message: 'Order payment already processed'
        });
    }

    try {
        // Process payment using the enhanced service
        const paymentResult = await PaymentService.processPayment({
            amount: order.totalAmount,
            currency: 'AED',
            paymentMethod,
            referenceType: 'order',
            referenceId: orderId,
            customerId: order.userId._id,
            cardToken,
            metadata: {
                ...metadata,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                processedBy: req.user.id
            }
        });

        // Update stock quantities for successful payments
        if (paymentResult.payment.paymentStatus === 'completed') {
            for (const item of order.items) {
                await StoreItem.findByIdAndUpdate(
                    item.productId,
                    { $inc: { stock: -item.quantity } }
                );
            }
            
            // Update order status
            order.status = 'paid';
            order.paymentId = paymentResult.payment._id;
            await order.save();
        }

        // Send notification
        await Notification.createNotification(
            order.userId._id,
            `Payment of ${order.totalAmount} AED processed for order #${order._id}`
        );

        res.status(200).json({
            success: true,
            data: paymentResult,
            message: 'Payment processed successfully'
        });

    } catch (error) {
        logger.error('Order payment processing error', {
            error: error.message,
            orderId,
            userId: req.user.id
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET PAYMENT HISTORY WITH ADVANCED FILTERING
 * @route GET /api/payments
 * @access Authenticated users
 */
const getPaymentHistory = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 20, 
        status, 
        method,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        referenceType,
        referenceId
    } = req.query;

    // Build query based on user role
    let baseQuery = {};
    
    if (req.user.role === 'general' || req.user.role === 'truck_owner') {
        // Users can only see their own payments
        const userJobCards = await JobCard.find({ customerId: req.user.id }).select('_id');
        baseQuery.$or = [
            { jobCardId:{ $in: userJobCards.map(jc => jc._id) } },
            {customerId: req.user.id }
        ];
    }

    // filters
    if (status) baseQuery.paymentStatus = status;
    if (method) baseQuery.paymentMethod = method;
    if (referenceType) baseQuery.referenceType = referenceType;
    if (referenceId) baseQuery.referenceId = referenceId;
    
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

    // Execute query with population
    const [payments, totalPayments, analytics] = await Promise.all([
        Payment.find(baseQuery)
            .populate([
                {
                    path: 'jobCardId',
                    select: 'jobCardNumber serviceType status',
                    populate: {
                        path: 'customerId',
                        select: 'name email'
                }
            },
            {
                path: referenceId,
                select: 'orderNumber totalAmount status', 
                populate: {
                    path: 'userId',
                    select: 'name email'
                }
            }
        ])
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit),
        
        Payment.countDocuments(baseQuery),
        
        // Payment analytics
        Payment.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$grandTotal' },
                    avgAmount: { $avg: '$grandTotal' },
                    completedPayments: {
                        $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] }
                    },
                    pendingPayments: {
                        $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
                    }
                }
            }
        ])
    ]);

    const analyticsData = analytics[0] || {};

    res.status(200).json({
        success: true,
        data: {
            payments,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalPayments / limit),
                totalPayments,
                limit: parseInt(limit)
            },
            analytics: {
                totalAmount: analyticsData.totalAmount || 0,
                averageAmount: analyticsData.avgAmount || 0,
                completedPayments: analyticsData.completedPayments || 0,
                pendingPayments: analyticsData.pendingPayments || 0,
                successRate: totalPayments > 0 
                    ? ((analyticsData.completedPayments || 0) / totalPayments * 100).toFixed(2)
                    : 0
            }
        }
    });
});

/**
 * GET PAYMENT DETAILS
 * @route GET /api/payments/:id
 * @access Authenticated users
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
        });

    if (!payment) {
        return res.status(404).json({
            success: false,
            message: 'Payment not found'
        });
    }

    // Permission check
    if (req.user.role === 'general' || req.user.role === 'truck_owner') {
        if (payment.jobCardId.customerId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this payment'
            });
        }
    }

    res.status(200).json({
        success: true,
        data: payment
    });
});

/**
 * INITIATE REFUND
 * @route POST /api/payments/:id/refund
 * @access Admin/Employee only
 */
const refundPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(id)
        .populate('jobCardId')
        .populate('referenceId');
    
    if (!payment) {
        return res.status(404).json({
            success: false,
            message: 'Payment not found'
        });
    }

    if (payment.paymentStatus !== 'completed') {
        return res.status(400).json({
            success: false,
            message: 'Can only refund completed payments'
        });
    }

    const refundAmount = amount || payment.grandTotal;
    
    if (refundAmount > payment.grandTotal) {
        return res.status(400).json({
            success: false,
            message: 'Refund amount cannot exceed original payment'
        });
    }

    try {
        let refundResult;
        
        // Process refund based on original payment method
        if (payment.paymentMethod === 'online' && payment.paymentReference) {
            refundResult = await PaymentService.processRefund({ // Fixed variable name
                paymentIntentId: payment.paymentReference,
                amount: refundAmount * 100, // Convert to cents
                reason
            });
        }

        // Update payment record
        payment.refundAmount = refundAmount;
        payment.refundReason = reason;
        payment.refundStatus = 'processed';
        payment.refundDate = new Date();
        payment.refundReference = refundResult?.refund?.id || `REFUND-${Date.now()}`;
        payment.metadata.refundProcessedBy = req.user.id;

        await payment.save();

        // Update reference document status based on type
        if (payment.referenceType === 'jobCard') {
            const jobCard = await JobCard.findById(payment.referenceId);
            if(jobCard) {
                jobCard.status = refundAmount === payment.grandTotal ? 'refunded' : 'partially_refunded';
                jobCard.paymentNotes = jobCard.paymentNotes || [];
                jobCard.paymentNotes.push({
                    note: `Refund of ${refundAmount} AED processed`,
                    reason: reason,
                    date: new Date()
                });
                await jobCard.save();
            }
        } else if (payment.referenceType === 'order') {
            const order = await Order.findById(payment.referenceId);
            if(order) {
                order.status = refundAmount === payment.grandTotal ? 'refunded' : 'partially_refunded';
                await order.save();
                
                // Restock items for order refunds
                if (refundAmount === payment.grandTotal) {
                    for (const item of order.items) {
                        await StoreItem.findByIdAndUpdate(
                            item.productId,
                            { $inc: { stock: item.quantity } }
                        );
                    }
                }
            }
        }

        // Send notification to customer
        const customerId = payment.referenceType === 'jobCard' 
            ? payment.jobCardId?.customerId 
            : payment.referenceId?.userId;
            
        if (customerId) {
            await Notification.createNotification(
                customerId,
                `Refund of ${refundAmount} AED has been processed for your ${payment.referenceType}. Reason: ${reason}`
            );
        }

        logger.info('Refund processed', {
            paymentId: payment._id,
            refundAmount,
            reason,
            processedBy: req.user.id
        });

        res.status(200).json({
            success: true,
            data: payment,
            message: 'Refund processed successfully'
        });

    } catch (error) {
        logger.error('Refund processing error', {
            error: error.message,
            paymentId: payment._id
        });

        res.status(500).json({
            success: false,
            message: 'Refund processing failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * GET PAYMENT ANALYTICS
 * @route GET /api/payments/analytics
 * @access Admin/Employee only
 */
const getPaymentAnalytics = asyncHandler(async (req, res) => {
    const { period = '30d', groupBy = 'day', referenceType } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
        case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
        case '1y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
    }

    // Build match query
    const matchQuery = {
        paymentStatus: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (referenceType) {
        matchQuery.referenceType = referenceType;
    }

    // Advanced payment analytics
    const analytics = await Payment.aggregate([
        { $match: matchQuery },
        {
            $facet: {
                overview: [
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$grandTotal' },
                            totalTransactions: { $sum: 1 },
                            avgTransactionValue: { $avg: '$grandTotal' },
                            totalVAT: { $sum: '$vat' },
                            totalRefunds: { $sum: '$refundAmount' }
                        }
                    }
                ],
                byMethod: [
                    {
                        $group: {
                            _id: '$paymentMethod',
                            revenue: { $sum: '$grandTotal' },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { revenue: -1 } }
                ],
                timeline: [
                    {
                        $group: {
                            _id: {
                                date: { 
                                    $dateToString: { 
                                        format: groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d', 
                                        date: '$createdAt' 
                                    } 
                                }
                            },
                            revenue: { $sum: '$grandTotal' },
                            transactions: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.date': 1 } }
                ],
                referenceTypes: [
                    {
                        $group: {
                            _id: '$referenceType',
                            revenue: { $sum: '$grandTotal' },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { revenue: -1 } }
                ]
            }
        }
    ]);

    const analyticsData = analytics[0];
    const overview = analyticsData.overview[0] || {};

    // Calculate growth rates
    const previousPeriodAnalytics = await calculatePreviousPeriodGrowth(startDate, period, referenceType);

    res.status(200).json({
        success: true,
        data: {
            period,
            overview: {
                ...overview,
                growthRate: previousPeriodAnalytics.growthRate,
                transactionGrowth: previousPeriodAnalytics.transactionGrowth
            },
            breakdown: {
                byPaymentMethod: analyticsData.byMethod,
                byReferenceType: analyticsData.referenceTypes
            },
            trends: {
                timeline: analyticsData.timeline
            },
            insights: generateFinancialInsights(analyticsData)
        }
    });
});

/**
 * HANDLE PAYMENT WEBHOOKS
 * @route POST /api/payments/webhook
 * @access Payment gateway
 */
const webhookPaymentHandler = asyncHandler(async (req, res) => {
    const event = req.body;
    logger.info('Received payment webhook', {
        eventType: event.type,
        eventId: event.id
    });

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;
            case 'charge.refunded':
                await handleRefundProcessed(event.data.object);
                break;
            default:
                logger.warn('Unhandled webhook event type', { type: event.type });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Webhook processing failed', {
            error: error.message,
            event
        });
        res.status(500).json({ success: false });
    }
});

// Webhook handler implementations
async function handlePaymentSuccess(paymentIntent) {
    const payment = await Payment.findOne({ paymentReference: paymentIntent.id });
    if (!payment) {
        logger.error('Payment not found for successful webhook', {
            paymentIntentId: paymentIntent.id
        });
        return;
    }

    payment.paymentStatus = 'completed';
    await payment.save();

    // Update the relevant document based on reference type
    if (payment.referenceType === 'jobCard') {
        const jobCard = await JobCard.findById(payment.referenceId);
        if (jobCard) {
            jobCard.status = 'paid';
            jobCard.paymentId = payment._id;
            await jobCard.save();
        }

        // Send notification
        await Notification.createNotification(
            jobCard.customerId,
            `Payment of ${payment.grandTotal} AED processed successfully for job card #${jobCard.jobCardNumber}`
        );
    } else if (payment.referenceType === 'order') {
        const order = await Order.findById(payment.referenceId);
        if (order) {
            order.status = 'paid';
            order.paymentId = payment._id;
            await order.save();
            
            // Update stock for orders
            for (const item of order.items) {
                await StoreItem.findByIdAndUpdate(
                    item.productId,
                    { $inc: { stock: -item.quantity } }
                );
            }
        }

        // Send notification
        await Notification.createNotification(
            order.userId,
            `Payment of ${payment.grandTotal} AED processed successfully for order #${order.orderNumber}`
        );
    }

    logger.info('Payment confirmed via webhook', {
        paymentId: payment._id,
        referenceType: payment.referenceType,
        referenceId: payment.referenceId
    });
}

async function handlePaymentFailure(paymentIntent) {
    const payment = await Payment.findOne({ paymentReference: paymentIntent.id });
    if (!payment) return;

    payment.paymentStatus = 'failed';
    payment.failureReason = paymentIntent.last_payment_error?.message || 'Unknown error';
    await payment.save();

    // Send notification based on reference type
    if (payment.referenceType === 'jobCard') {
        const jobCard = await JobCard.findById(payment.referenceId);
        if (jobCard) {
            await Notification.createNotification(
                jobCard.customerId,
                `Payment failed for job card #${jobCard.jobCardNumber}. Reason: ${payment.failureReason}`
            );
        }
    } else if (payment.referenceType === 'order') {
        const order = await Order.findById(payment.referenceId);
        if (order) {
            await Notification.createNotification(
                order.userId,
                `Payment failed for order #${order.orderNumber}. Reason: ${payment.failureReason}`
            );
        }
    }

    logger.warn('Payment failed via webhook', {
        paymentId: payment._id,
        reason: payment.failureReason
    });
}

async function handleRefundProcessed(charge) {
    const refund = charge.refunds.data[0];
    if (!refund) return;

    const payment = await Payment.findOne({ paymentReference: charge.payment_intent });
    if (!payment) return;

    payment.refundAmount = refund.amount / 100;
    payment.refundStatus = 'processed';
    payment.refundDate = new Date(refund.created * 1000);
    payment.refundReference = refund.id;
    await payment.save();

    // Update reference document status based on type
    if (payment.referenceType === 'jobCard') {
        const jobCard = await JobCard.findById(payment.referenceId);
        if (jobCard) {
            jobCard.status = payment.refundAmount === payment.grandTotal ? 'refunded' : 'partially_refunded';
            await jobCard.save();
        }
    } else if (payment.referenceType === 'order') {
        const order = await Order.findById(payment.referenceId);
        if (order) {
            order.status = payment.refundAmount === payment.grandTotal ? 'refunded' : 'partially_refunded';
            await order.save();
            
            // Restock items for full refunds
            if (payment.refundAmount === payment.grandTotal) {
                for (const item of order.items) {
                    await StoreItem.findByIdAndUpdate(
                        item.productId,
                        { $inc: { stock: item.quantity } }
                    );
                }
            }
        }
    }

    // Send notification based on reference type
    if (payment.referenceType === 'jobCard') {
        const jobCard = await JobCard.findById(payment.referenceId);
        if (jobCard) {
            await Notification.createNotification(
                jobCard.customerId,
                `Refund of ${payment.refundAmount} AED processed for job card #${jobCard.jobCardNumber}`
            );
        }
    } else if (payment.referenceType === 'order') {
        const order = await Order.findById(payment.referenceId);
        if (order) {
            await Notification.createNotification(
                order.userId,
                `Refund of ${payment.refundAmount} AED processed for order #${order.orderNumber}`
            );
        }
    }

    logger.info('Refund processed via webhook', {
        paymentId: payment._id,
        refundAmount: payment.refundAmount
    });
}

// Helper Functions

/**
 * Calculate previous period growth for comparison
 */
async function calculatePreviousPeriodGrowth(startDate, period, referenceType = null) {
    const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
    };

    const days = periodDays[period] || 30;
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);
    
    const previousEndDate = new Date(startDate);

    const matchQuery = {
        paymentStatus: 'completed',
        createdAt: { $gte: previousStartDate, $lt: previousEndDate }
    };
    
    if (referenceType) {
        matchQuery.referenceType = referenceType;
    }

    const previousStats = await Payment.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                revenue: { $sum: '$grandTotal' },
                transactions: { $sum: 1 }
            }
        }
    ]);

    const currentMatchQuery = {
        paymentStatus: 'completed',
        createdAt: { $gte: startDate }
    };
    
    if (referenceType) {
        currentMatchQuery.referenceType = referenceType;
    }

    const currentStats = await Payment.aggregate([
        { $match: currentMatchQuery },
        {
            $group: {
                _id: null,
                revenue: { $sum: '$grandTotal' },
                transactions: { $sum: 1 }
            }
        }
    ]);

    const previous = previousStats[0] || { revenue: 0, transactions: 0 };
    const current = currentStats[0] || { revenue: 0, transactions: 0 };

    return {
        growthRate: previous.revenue > 0 
            ? ((current.revenue - previous.revenue) / previous.revenue * 100).toFixed(2)
            : 0,
        transactionGrowth: previous.transactions > 0
            ? ((current.transactions - previous.transactions) / previous.transactions * 100).toFixed(2)
            : 0
    };
}

/**
 * Generate AI-powered financial insights
 */
function generateFinancialInsights(analyticsData) {
    const insights = [];
    
    // Revenue insights
    const totalRevenue = analyticsData.overview[0]?.totalRevenue || 0;
    if (totalRevenue > 10000) {
        insights.push({
            type: 'revenue_milestone',
            message: `Congratulations! You've reached ${totalRevenue.toLocaleString()} AED in revenue`,
            impact: 'positive'
        });
    }

    // Payment method insights
    const topMethod = analyticsData.byMethod[0];
    if (topMethod && topMethod._id === 'online') {
        insights.push({
            type: 'digital_adoption',
            message: `${((topMethod.revenue / totalRevenue) * 100).toFixed(1)}% of revenue comes from online payments`,
            impact: 'positive'
        });
    }

    return insights;
}

module.exports = {
    processJobCardPayment,
    processOrderPayment,
    getPaymentHistory,
    getPaymentById,
    refundPayment,
    getPaymentAnalytics,
    webhookPaymentHandler
};