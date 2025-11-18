// models/Payment.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    // Link to JobCard (optional; null if order payment)
    jobCardId: {
      type: Schema.Types.ObjectId,
      ref: 'JobCard',
      default: null
    },

    // Link to Order (optional; null if job card payment)
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },

    // Customer who made the payment
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Payment amount fields
    amount: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    currency: { type: String, default: 'AED' },

    // Payment method and status
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'cash', 'online', 'wallet'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },

    // Payment gateway info
    transactionId: { type: String },
    gatewayResponse: { type: Schema.Types.Mixed },
    cardInfo: { type: Schema.Types.Mixed },

    // Refund fields
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundReason: { type: String, trim: true, default: '' },

    // Reference fields to distinguish jobcard vs order
    referenceType: {
      type: String,
      enum: ['jobcard', 'order'],
      required: true
    },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    paymentReference: { type: String, trim: true }, // optional internal ref

    // Additional info
    notes: { type: String, trim: true, default: '' },
    metadata: { type: Schema.Types.Mixed },
    processedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', PaymentSchema);
module.exports = Payment;