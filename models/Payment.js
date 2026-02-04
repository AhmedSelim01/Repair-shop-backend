// models/Payment.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentItemSchema = new Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const PaymentSchema = new Schema({
  paymentFor: {
    type: String,
    enum: ['invoice','order'],
    required: true
  },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
  jobCardId: { type: Schema.Types.ObjectId, ref: 'JobCard', default: null },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  customerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: { type: [PaymentItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  vat: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'AED' },
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
  transactionId: { type: String },
  gatewayResponse: { type: Schema.Types.Mixed },
  cardInfo: { type: Schema.Types.Mixed },
  refundedAt: { type: Date, default: null },
  refundAmount: { type: Number, default: 0, min: 0 },
  refundReason: { type: String, trim: true, default: '' },
  referenceType: { type: String, enum: ['jobcard','order','invoice'], required: true },
  referenceId: { type: Schema.Types.ObjectId, required: true },
  paymentReference: { type: String, trim: true },
  notes: { type: String, trim: true, default: '' },
  metadata: { type: Schema.Types.Mixed },
  processedAt: { type: Date, default: null }
}, 
{ timestamps: true });

// Pre-validate middleware: auto-calculate subtotal, VAT, and grandTotal
PaymentSchema.pre('validate', function(next) {
  if (this.items && this.items.length > 0) {
    const calculatedSubtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.subtotal = calculatedSubtotal;

    const vatPercentage = process.env.VAT_PERCENTAGE ? parseFloat(process.env.VAT_PERCENTAGE) : 0;
    this.vat = (calculatedSubtotal * vatPercentage) / 100;

    this.grandTotal = calculatedSubtotal + this.vat - (this.discount || 0);
  }
  next();
});

PaymentSchema.pre('validate', function (next) {
  if (this.paymentFor === 'invoice' && !this.invoiceId) {
    return next(new Error('invoiceId is required for invoice payments'));
  }

  if (this.paymentFor === 'order' && !this.orderId) {
    return next(new Error('orderId is required for order payments'));
  }

  next();
});

// Method to generate receipt
PaymentSchema.methods.generateReceipt = function() {
  return {
    paymentId: this._id,
    customerId: this.customerId,
    referenceType: this.referenceType,
    referenceId: this.referenceId,
    items: this.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    })),
    subtotal: this.subtotal,
    vat: this.vat,
    discount: this.discount,
    grandTotal: this.grandTotal,
    currency: this.currency,
    paymentStatus: this.paymentStatus,
    paymentMethod: this.paymentMethod,
    processedAt: this.processedAt
  };
};

const Payment = mongoose.model('Payment', PaymentSchema);
module.exports = Payment;