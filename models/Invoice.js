const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'customerType',
      required: true
    },

    customerType: {
      type: String,
      enum: ['User', 'Company'],
      required: true
    },

    jobCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobCard',
      default: null
    },

    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null
    },

    deliveryNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryNote',
      default: null
    },

    status: {
      type: String,
      enum: ['draft', 'issued', 'cancelled'],
      default: 'draft'
    },

    invoiceNumber: {
      type: String,
      default: null
    },

    year: Number,
    sequenceNumber: Number,

    items: [
      {
        description: String,
        qty: Number,
        unitPrice: Number,
        total: Number
      }
    ],

    Currency: {type: String, default: 'AED' },
    subtotal: { type: Number, default: 0 },
    vatPercent: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    isLocked: {
      type: Boolean,
      default: false
    },

    issuedAt: Date,
    
    paymentDueDate: {
      type: Date,
      default: null
    },

    paidAmount: {
      type: Number,
      default: 0
    },

    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment"
      }
    ],

    paidAt: {
      type: Date,
      default: null
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);