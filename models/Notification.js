const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['unread', 'read'],
        default: 'unread',
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

const Notification = mongoose.model('Notification', NotificationSchema);

// Marks a notification as read
Notification.markAsRead = async (notificationId) => {
    const notification = await Notification.findById(notificationId);
    if (!notification) throw new Error('Notification not found');
    
    notification.status = 'read';
    await notification.save();
    return notification;
};

// Creates a new notification for a user
Notification.createNotification = async (userId, message) => {
    const newNotification = new Notification({
        userId,
        message,
    });
    await newNotification.save();
    return newNotification;
};

module.exports = Notification;