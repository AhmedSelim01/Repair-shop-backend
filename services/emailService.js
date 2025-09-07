
/**
 * ENHANCED EMAIL SERVICE
 * Advanced email system with templates, scheduling, and delivery tracking
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    /**
     * Send notification email with smart templates
     */
    async sendNotificationEmail(notification) {
        try {
            const user = await require('../models/User').findById(notification.userId);
            if (!user || !user.email) return;

            const template = this.getEmailTemplate(notification.type, notification.message);
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: template.subject,
                html: template.html,
                priority: this.mapPriorityToEmail(notification.priority)
            };

            await this.transporter.sendMail(mailOptions);
            logger.info('Notification email sent', { 
                userId: notification.userId, 
                type: notification.type 
            });

        } catch (error) {
            logger.error('Failed to send notification email', { 
                error: error.message,
                notificationId: notification._id 
            });
            throw error;
        }
    }

    /**
     * Get email template based on notification type
     */
    getEmailTemplate(type, message) {
        const templates = {
            payment: {
                subject: '💳 Payment Confirmation - Repair Shop',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2c3e50;">Payment Processed Successfully</h2>
                        <p>${message}</p>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Thank you for your payment!</strong></p>
                            <p>Your transaction has been processed successfully.</p>
                        </div>
                    </div>
                `
            },
            security: {
                subject: '🔒 Security Alert - Repair Shop',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #e74c3c;">Security Alert</h2>
                        <p>${message}</p>
                        <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Immediate attention required!</strong></p>
                        </div>
                    </div>
                `
            },
            general: {
                subject: '📢 Notification - Repair Shop',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #3498db;">Notification</h2>
                        <p>${message}</p>
                    </div>
                `
            }
        };

        return templates[type] || templates.general;
    }

    /**
     * Map notification priority to email priority
     */
    mapPriorityToEmail(priority) {
        const mapping = {
            urgent: 'high',
            high: 'high',
            medium: 'normal',
            low: 'low'
        };
        return mapping[priority] || 'normal';
    }
}

module.exports = new EmailService();