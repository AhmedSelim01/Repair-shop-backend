
/**
 * NOTIFICATION CONTROLLER
 * Advanced real-time notification system with AI-powered smart alerts and multi-channel delivery
 * Features push notifications, email integration, and intelligent notification prioritization
 */

const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../config/logger');
const realTimeTracker = require('../utils/realTimeTracker');
const emailService = require('../services/emailService');

// Helper Functions

/**
 * AI-powered priority detection based on message content
 */
function detectNotificationPriority(message, type) {
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'immediate', 'asap'];
    const highKeywords = ['important', 'priority', 'deadline', 'overdue'];
    
    const messageWords = message.toLowerCase().split(/\s+/);
    
    if (urgentKeywords.some(keyword => messageWords.includes(keyword))) {
        return 'urgent';
    }
    
    if (highKeywords.some(keyword => messageWords.includes(keyword))) {
        return 'high';
    }
    
    // Type-based priority assignment
    if (['security', 'payment', 'system'].includes(type)) {
        return 'high';
    }
    
    return 'medium';
}

/**
 * Multi-channel notification delivery
 */
async function deliverNotification(notification) {
    const deliveryPromises = [];

    // App notification (real-time via WebSocket)
    if (notification.channels.includes('app')) {
        deliveryPromises.push(
            realTimeTracker.sendToUser(notification.userId, {
                type: 'notification',
                data: notification
            }).then(() => {
                notification.deliveryStatus.app = 'delivered';
            }).catch(error => {
                logger.error('Real-time notification failed', {
                    notificationId: notification._id,
                    userId: notification.userId,
                    error: error.message
                });
                notification.deliveryStatus.app = 'failed';
            })
        );
    }

    // Email notification
    if (notification.channels.includes('email')) {
        deliveryPromises.push(
            emailService.sendNotificationEmail(notification).then(() => {
                notification.deliveryStatus.email = 'delivered';
            }).catch(error => {
                logger.error('Email notification failed', {
                    notificationId: notification._id,
                    userId: notification.userId,
                    error: error.message
                });
                notification.deliveryStatus.email = 'failed';
            })
        );
    }

    // SMS notification (placeholder for future implementation)
    if (notification.channels.includes('sms')) {
        // SMS service integration would go here
        notification.deliveryStatus.sms = 'not_implemented';
    }

    await Promise.allSettled(deliveryPromises);

    try {
        await notification.save();
    } catch (saveError) {
        logger.error('Failed to save notification delivery status', {
            notificationId: notification._id,
            error: saveError.message
        });
    }
}

/**
 * Calculate engagement rate from notification statistics
 */
function calculateEngagementRate(stats) {
    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const read = stats.find(s => s._id === 'read')?.count || 0;
    return total > 0 ? (read / total * 100).toFixed(2) : 0;
}

/**
 * CREATE SMART NOTIFICATION
 * AI-powered notification creation with automatic categorization and priority assignment
 * @route POST /api/notifications
 * @access Authenticated users
 */
const createNotification = asyncHandler(async (req, res) => {
    const userId= req.user.id || req.user.id;
        if (userId !== req.body.userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Unauthorized to create notifications for other users'
        });
    }

    const { 
        message, 
        type = 'general', 
        priority = 'medium',
        metadata = {},
        scheduleFor,
        channels = ['app'] // app, email, sms
    } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Validate notification channels
    const ALLOWED_CHANNELS = ['app', 'email', 'sms'];
    if (channels.some(ch => !ALLOWED_CHANNELS.includes(ch))) {
        return res.status(400).json({
            success: false,
            message: `Invalid delivery channels. Allowed: ${ALLOWED_CHANNELS.join(', ')}`
        });
    }

    // AI-powered priority detection based on message content
    const smartPriority = detectNotificationPriority(message, type);
    
    // Create notification with enhanced features
    const notification = new Notification({
        userId,
        message,
        type,
        priority: smartPriority || priority,
        metadata: {
            ...metadata,
            source: 'api',
            createdBy: req.user.id,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
        },
        channels,
        scheduleFor: scheduleFor ? new Date(scheduleFor) : null,
        deliveryStatus: {
            app: 'pending',
            email: channels.includes('email') ? 'pending' : 'not_applicable',
            sms: channels.includes('sms') ? 'pending' : 'not_applicable'
        }
    });

    await notification.save();

    // Immediate delivery for non-scheduled notifications
    if (!scheduleFor) {
        await deliverNotification(notification);
    }

    logger.info('Smart notification created', {
        notificationId: notification._id,
        userId,
        type,
        priority: smartPriority || priority,
        channels
    });

    res.status(201).json({
        success: true,
        data: notification,
        message: 'Smart notification created successfully'
    });
});

/**
 * GET USER NOTIFICATIONS WITH ADVANCED FILTERING
 * @route GET /api/notifications
 * @access Authenticated users
 */
const getUserNotifications = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 20, 
        status, 
        type, 
        priority,
        dateFrom,
        dateTo,
        unreadOnly = false
    } = req.query;

    // Apply pagination limits
    const MAX_LIMIT = 100;
    const effectiveLimit = Math.min(parseInt(limit), MAX_LIMIT);
    // Validate pagination parameters
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    if (isNaN(parsedPage) || isNaN(parsedLimit)) {
    return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters'
    });
}

    // Build advanced query
    const query = { userId: req.user._id };
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (unreadOnly === 'true') query.status = 'unread';
    
    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Execute query with aggregation for statistics
    const [notifications, stats] = await Promise.all([
        Notification.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .limit(effectiveLimit)
            .skip((parsedPage - 1) * effectiveLimit),
        
        Notification.aggregate([
            { $match: { userId: req.user._id} },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const totalNotifications = await Notification.countDocuments(query);

    // Calculate notification insights
    const insights = {
        totalUnread: stats.find(s => s._id === 'unread')?.count || 0,
        totalRead: stats.find(s => s._id === 'read')?.count || 0,
        engagementRate: calculateEngagementRate(stats)
    };

    res.status(200).json({
        success: true,
        data: {
            notifications,
            pagination: {
                currentPage: parsedPage,
                totalPages: Math.ceil(totalNotifications / effectiveLimit),
                totalNotifications,
                limit: effectiveLimit
            },
            insights
        }
    });
});

/**
 * MARK NOTIFICATIONS AS READ (BULK OPERATION)
 * @route PUT /api/notifications/mark-read
 * @access Authenticated users
 */
const markNotificationsAsRead = asyncHandler(async (req, res) => {
    const { notificationIds = [], markAll = false } = req.body;

    let updateQuery = { userId: req.user.id, status: 'unread' };
    
    if (!markAll && notificationIds.length > 0) {
        updateQuery._id = { $in: notificationIds };
    }

    const result = await Notification.updateMany(
        updateQuery,
        { 
            status: 'read',
            readAt: new Date(),
            'metadata.readDevice': req.headers['user-agent']
        }
    );

    // Real-time notification to user about read status
    realTimeTracker.sendToUser(req.user.id, {
        type: 'notifications_read',
        count: result.modifiedCount
    });

    logger.info('Notifications marked as read', {
        userId: req.user.id,
        count: result.modifiedCount,
        markAll
    });

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`,
        modifiedCount: result.modifiedCount
    });
});

/**
 * DELETE NOTIFICATIONS (BULK OPERATION)
 * @route DELETE /api/notifications
 * @access Authenticated users
 */
const deleteNotifications = asyncHandler(async (req, res) => {
    const { notificationIds, deleteAll = false, olderThan } = req.body;

    let deleteQuery = { userId: req.user.id };
    
    if (deleteAll && olderThan) {
        deleteQuery.createdAt = { $lt: new Date(olderThan) };
    } else if (notificationIds && notificationIds.length > 0) {
        deleteQuery._id = { $in: notificationIds };
    } else if (!deleteAll) {
        return res.status(400).json({
            success: false,
            message: 'Notification IDs required or set deleteAll to true'
        });
    }

    const result = await Notification.deleteMany(deleteQuery);

    logger.info('Notifications deleted', {
        userId: req.user.id,
        deletedCount: result.deletedCount,
        deleteAll
    });

    res.status(200).json({
        success: true,
        message: `${result.deletedCount} notifications deleted`,
        deletedCount: result.deletedCount
    });
});

/**
 * GET NOTIFICATION ANALYTICS
 * @route GET /api/notifications/analytics
 * @access Authenticated users
 */
const getNotificationAnalytics = asyncHandler(async (req, res) => {
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
        case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
        default:
            return res.status(400).json({
                success: false,
                message: 'Invalid timeframe specified'
            });
    }

    // Advanced analytics aggregation
    const analytics = await Notification.aggregate([
        {
            $match: {
                userId: req.user._id,
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $facet: {
                byType: [
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ],
                byPriority: [
                    { $group: { _id: '$priority', count: { $sum: 1 } } }
                ],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                dailyTrend: [
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.date': 1 } }
                ],
                engagement: [
                    {
                        $group: {
                            _id: null,
                            totalSent: { $sum: 1 },
                            totalRead: {
                                $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
                            },
                            avgResponseTime: {
                                $avg: {
                                    $cond: [
                                        { $ne: ['$readAt', null] },
                                        { $subtract: ['$readAt', '$createdAt'] },
                                        null
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        }
    ]);

    const analyticsData = analytics[0];
    const engagement = analyticsData.engagement[0] || {};
    
    // Calculate engagement metrics
    const engagementRate = engagement.totalSent > 0 
        ? (engagement.totalRead / engagement.totalSent * 100).toFixed(2)
        : 0;
    
    const avgResponseTimeHours = engagement.avgResponseTime 
        ? (engagement.avgResponseTime / (1000 * 60 * 60)).toFixed(2)
        : null;

    res.status(200).json({
        success: true,
        data: {
            timeframe,
            summary: {
                totalNotifications: engagement.totalSent || 0,
                readNotifications: engagement.totalRead || 0,
                engagementRate: parseFloat(engagementRate),
                avgResponseTime: avgResponseTimeHours ? `${avgResponseTimeHours} hours` : 'N/A'
            },
            breakdown: {
                byType: analyticsData.byType,
                byPriority: analyticsData.byPriority,
                byStatus: analyticsData.byStatus
            },
            trends: {
                daily: analyticsData.dailyTrend
            }
        }
    });
});

/**
 * BROADCAST NOTIFICATION TO MULTIPLE USERS
 * @route POST /api/notifications/broadcast
 * @access Admin only
 */
const broadcastNotification = asyncHandler(async (req, res) => {
        if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    const { 
        userIds, 
        message, 
        type = 'broadcast', 
        priority = 'medium',
        filterCriteria,
        channels = ['app']
    } = req.body;

    let targetUserIds = userIds;

    // If filter criteria provided, find users matching criteria
    if (filterCriteria && !userIds) {
        const users = await User.find(filterCriteria).select('_id');
        targetUserIds = users.map(user => user._id);
    }

    if (!targetUserIds || targetUserIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No target users specified'
        });
    }
        // Broadcast size limitation
    const MAX_BROADCAST_SIZE = 1000;
    if (targetUserIds.length > MAX_BROADCAST_SIZE) {
        return res.status(400).json({
            success: false,
            message: `Broadcast limited to ${MAX_BROADCAST_SIZE} users per request`
        });
    }

    // Create notifications for all target users
    const notifications = targetUserIds.map(userId => ({
        userId,
        message,
        type,
        priority,
        metadata: {
            broadcast: true,
            createdBy: req.user.id,
            broadcastId: new Date().getTime()
        },
        channels
    }));

    try {
        const createdNotifications = await Notification.insertMany(notifications);

        // Deliver notifications with error handling
        await Promise.allSettled(
            createdNotifications.map(notification => 
                deliverNotification(notification).catch(error => {
                    logger.error('Notification delivery failed', {
                        notificationId: notification._id,
                        userId: notification.userId,
                        error: error.message
                    });
                })
            )
        );

        logger.info('Broadcast notification sent', {
            adminId: req.user.id,
            targetCount: targetUserIds.length,
            type,
            priority
        });

        res.status(201).json({
            success: true,
            message: `Broadcast notification sent to ${targetUserIds.length} users`,
            data: {
                broadcastId: createdNotifications[0]?.metadata?.broadcastId,
                recipientCount: targetUserIds.length
            }
        });
    } catch (error) {
        logger.error('Broadcast notification failed', {
            adminId: req.user.id,
            error: error.message
        });
        res.status(500).json({
            success: false,
            message: 'Failed to send broadcast notifications'
        });
    }
});

module.exports = {
    createNotification,
    getUserNotifications,
    markNotificationsAsRead,
    deleteNotifications,
    getNotificationAnalytics,
    broadcastNotification
};
