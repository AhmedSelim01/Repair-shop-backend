const mongoose = require('mongoose');

/**
 * PAYMENT SCHEMA
 * Handles all payment transactions in the repair shop system
 * Supports multiple payment methods and comprehensive tracking
 */
const PaymentSchema = new mongoose.Schema({
    // ===== TRANSACTION IDENTIFICATION =====
    transactionId: {
        type: String,
        required: true,
        default: function() {
            return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
    },
    
    // ===== PAYMENT REFERENCES =====
    jobCardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobCard',
        required: true
    },
    
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // ===== PAYMENT DETAILS =====
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    grandTotal: {
        type: Number,
        required: true,
        min: 0
    },
    
    currency: {
        type: String,
        default: 'AED',
        enum: ['AED', 'USD', 'EUR', 'SAR']
    },
    
    // ===== PAYMENT METHOD =====
    paymentMethod: {
        type: String,
        required: true,
        enum: ['credit_card', 'debit_card', 'cash', 'bank_transfer', 'digital_wallet']
    },
    
    // ===== PAYMENT STATUS =====
    paymentStatus: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    
    // ===== PAYMENT GATEWAY DATA =====
    gatewayResponse: {
        gatewayTransactionId: String,
        gatewayName: String, // stripe, paypal, square, etc.
        responseCode: String,
        responseMessage: String,
        processingFee: Number
    },
    
    // ===== CARD DETAILS (Encrypted/Tokenized) =====
    cardInfo: {
        last4Digits: String,
        cardType: String, // visa, mastercard, amex
        expiryMonth: String,
        expiryYear: String
    },
    
    // ===== TIMESTAMPS =====
    processedAt: Date,
    refundedAt: Date,
    
    // ===== NOTES & METADATA =====
    notes: String,
    
    metadata: {
        ipAddress: String,
        userAgent: String,
        location: String
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// ===== INDEXES FOR PERFORMANCE =====
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ jobCardId: 1 });
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ paymentStatus: 1 });
PaymentSchema.index({ createdAt: -1 }); // For recent payments queries

// ===== VIRTUAL FIELDS =====
PaymentSchema.virtual('isSuccessful').get(function() {
    return this.paymentStatus === 'completed';
});

PaymentSchema.virtual('canRefund').get(function() {
    return this.paymentStatus === 'completed' && !this.refundedAt;
});

// ===== INSTANCE METHODS =====
PaymentSchema.methods.markAsCompleted = function() {
    this.paymentStatus = 'completed';
    this.processedAt = new Date();
    return this.save();
};

PaymentSchema.methods.markAsFailed = function(reason) {
    this.paymentStatus = 'failed';
    this.notes = reason || 'Payment failed';
    return this.save();
};

PaymentSchema.methods.processRefund = function(amount) {
    if (!this.canRefund) {
        throw new Error('Payment cannot be refunded');
    }
    
    this.paymentStatus = 'refunded';
    this.refundedAt = new Date();
    this.notes = `Refunded amount: ${amount || this.grandTotal}`;
    return this.save();
};

// ===== STATIC METHODS =====
PaymentSchema.statics.getTotalRevenue = function(dateFilter = {}) {
    return this.aggregate([
        {
            $match: {
                paymentStatus: 'completed',
                ...dateFilter
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$grandTotal' },
                count: { $sum: 1 }
            }
        }
    ]);
};

PaymentSchema.statics.getRevenueByMonth = function(year) {
    return this.aggregate([
        {
            $match: {
                paymentStatus: 'completed',
                createdAt: {
                    $gte: new Date(year, 0, 1),
                    $lt: new Date(year + 1, 0, 1)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$createdAt' },
                revenue: { $sum: '$grandTotal' },
                transactions: { $sum: 1 }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
};

// ===== PRE-SAVE MIDDLEWARE =====
PaymentSchema.pre('save', function(next) {
    // Calculate grand total if not provided
    if (!this.grandTotal) {
        this.grandTotal = (this.amount + this.tax) - this.discount;
    }
    
    // Set processed timestamp for completed payments
    if (this.paymentStatus === 'completed' && !this.processedAt) {
        this.processedAt = new Date();
    }
    
    next();
});

// Create and export the model
module.exports = mongoose.model('Payment', PaymentSchema);