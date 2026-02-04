// models/Order.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * OrderItem sub-schema
 * Stores a snapshot of the purchased item at time of order.
 */
const OrderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'StoreItem',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

/**
 * Order Schema
 */
const OrderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // snapshot of items purchased
  items: {
    type: [OrderItemSchema],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Order must contain at least one item.'
    }
  },

  // financials
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },

  // Payment & fulfillment
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'credit'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },

  // Order lifecycle
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending_payment'
  },

  // Links
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
  receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt', default: null },

  shippingAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true }
  },

  // Who handled the order in admin panel (optional)
  processedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // For credit terms
  dueDate: { type: Date, default: null },

  // flags & metadata
  isArchived: { type: Boolean, default: false },
  notes: { type: String, trim: true, default: '' }
}, {
  timestamps: true
});

/* INDEXES */
// optimize common queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, paymentStatus: 1 });

/* PRE-SAVE: ensure totals are consistent and calculated if missing */
OrderSchema.pre('validate', function(next) {
  try {
    // Calculate item totals if needed and compute subtotal
    if (this.items && this.items.length > 0) {
      this.items.forEach(item => {
        // Ensure totalPrice matches unitPrice * quantity
        item.totalPrice = Number((item.unitPrice * item.quantity).toFixed(2));
      });
      this.subtotal = Number(this.items.reduce((s, it) => s + it.totalPrice, 0).toFixed(2));
    } else {
      this.subtotal = 0;
    }

    // Ensure numeric fields are set
    this.tax = Number((this.tax || 0).toFixed(2));
    this.discountAmount = Number((this.discountAmount || 0).toFixed(2));
    this.totalAmount = Number((this.subtotal + this.tax - this.discountAmount).toFixed(2));

    return next();
  } catch (err) {
    return next(err);
  }
});

/* STATIC: createFromCart
   Helper to convert a Cart + StoreItem snapshots into an Order instance
*/
OrderSchema.statics.createFromCart = async function({ cart, userId, paymentMethod = 'online', shippingAddress = {}, processedBy = null }) {
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  // Build items snapshot
  const items = cart.items.map(i => ({
    productId: i.productId,
    name: i.name || i.productName || '', // fallback if cart stored names
    unitPrice: Number(i.unitPrice ?? i.totalPrice / (i.quantity || 1)),
    quantity: i.quantity,
    totalPrice: Number((i.totalPrice).toFixed(2))
  }));

  const subtotal = Number(items.reduce((s, it) => s + it.totalPrice, 0).toFixed(2));
  const tax = 0;
  const discountAmount = 0;
  const totalAmount = Number((subtotal + tax - discountAmount).toFixed(2));

  const doc = await this.create({
    userId,
    items,
    subtotal,
    tax,
    discountAmount,
    totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
    status: 'pending_payment',
    shippingAddress,
    processedBy
  });

  return doc;
};

/* INSTANCE: markPaid
   Mark order as paid, attach paymentId and create receipt linkage externally
*/
OrderSchema.methods.markPaid = async function({ paymentId, processedBy = null }) {
  this.paymentId = paymentId;
  this.paymentStatus = 'paid';
  this.status = 'paid';
  if (processedBy) this.processedBy = processedBy;
  await this.save();
  return this;
};

/* INSTANCE: adjustStock
   For each item, decrement stock from StoreItem (call StoreItem.updateStock)
   This method assumes StoreItem model exposes a safe stock adjustment method.
*/
OrderSchema.methods.adjustStock = async function(StoreItemModel) {
  if (!StoreItemModel) throw new Error('StoreItem model required');
  for (const item of this.items) {
    // reduce stock by quantity
    await StoreItemModel.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
  }
  return true;
};

const Order = model('Order', OrderSchema);
module.exports = Order;