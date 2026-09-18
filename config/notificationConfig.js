
/**
 * NOTIFICATION CONFIGURATION
 * Advanced notification system with multiple channels and templates
 */

const NotificationConfig = {
    // Notification types and their settings
    types: {
        JOB_CREATED: {
            title: 'New Job Created',
            template: 'job-created',
            channels: ['push', 'email'],
            priority: 'normal',
            roles: ['admin', 'employee']
        },
        JOB_COMPLETED: {
            title: 'Job Completed',
            template: 'job-completed',
            channels: ['push', 'email', 'sms'],
            priority: 'high',
            roles: ['truck_owner', 'admin']
        },
        PAYMENT_RECEIVED: {
            title: 'Payment Received',
            template: 'payment-received',
            channels: ['push', 'email'],
            priority: 'high',
            roles: ['truck_owner', 'admin']
        },
        SYSTEM_MAINTENANCE: {
            title: 'System Maintenance',
            template: 'system-maintenance',
            channels: ['push', 'email'],
            priority: 'urgent',
            roles: 'all'
        },
        TRUCK_LOCATION_UPDATE: {
            title: 'Truck Location Updated',
            template: 'location-update',
            channels: ['push'],
            priority: 'low',
            roles: ['truck_owner', 'admin']
        }
    },

    // Channel configurations
    channels: {
        push: {
            enabled: true,
            provider: 'websocket',
            retryAttempts: 3
        },
        email: {
            enabled: true,
            provider: 'nodemailer',
            retryAttempts: 3,
            templates: {
                'job-created': 'emails/job-created.html',
                'job-completed': 'emails/job-completed.html',
                'payment-received': 'emails/payment-received.html',
                'system-maintenance': 'emails/system-maintenance.html'
            }
        },
        sms: {
            enabled: false,
            provider: 'twilio',
            retryAttempts: 2
        }
    },

    // Delivery settings
    delivery: {
        batchSize: 100,
        retryDelay: 5000, // 5 seconds
        maxRetryDelay: 300000, // 5 minutes
        enableBatching: true
    },

    // Rate limiting
    rateLimits: {
        perUser: {
            push: 50, // per hour
            email: 10, // per hour
            sms: 5 // per hour
        },
        global: {
            push: 1000, // per minute
            email: 100, // per minute
            sms: 50 // per minute
        }
    }
};

module.exports = NotificationConfig;