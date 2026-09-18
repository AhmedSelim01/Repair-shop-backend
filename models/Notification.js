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
    }
}, {
    timestamps: true,
});

// Instance method
NotificationSchema.methods.markAsRead = async function () {
    this.status = 'read';
    await this.save();
    return this;
};

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;