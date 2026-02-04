// models/StoreItem.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const StoreItemSchema = new Schema({
  // Basic Info
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },

  // Pricing
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  discount: { type: Number, min: 0, max: 100, default: 0 },

  // Inventory
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },

  // Classification
  category: {
    type: String,
    required: true,
    enum: [
      'Engine Parts',
      'Brake System',
      'Transmission',
      'Electrical',
      'Body Parts',
      'Filters',
      'Fluids',
      'Tools',
      'Accessories',
      'Other'
    ]
  },
  subcategory: { type: String, trim: true },
  tags: [{ type: String, trim: true }],

  // Media
  imageUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  }],

  // Technical Details
  specifications: {
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    partNumber: { type: String, trim: true, unique: true, sparse: true },
    compatibility: [{ type: String, trim: true }],
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      weight: { type: Number, min: 0 }
    },
    material: { type: String, trim: true },
    warranty: { type: String, trim: true }
  },

  // Status & meta
  status: { type: String, enum: ['active', 'inactive', 'discontinued'], default: 'active' },
  isAvailable: { type: Boolean, default: true },

  // Analytics & Tracking
  views: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  rating: {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, default: 0 }
  },

  // Audit
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

/* INDEXES */
StoreItemSchema.index({ category: 1 });
StoreItemSchema.index({ price: 1 });
StoreItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
StoreItemSchema.index({ status: 1, isAvailable: 1 });
StoreItemSchema.index({ views: -1 });
StoreItemSchema.index({ salesCount: -1 });

/* VIRTUALS */
StoreItemSchema.virtual('discountedPrice').get(function() {
  const base = this.originalPrice || this.price;
  if (this.discount > 0 && base) {
    return Number((base * (1 - this.discount / 100)).toFixed(2));
  }
  return this.price;
});

StoreItemSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= this.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

/* PRE-SAVE: maintain derived values */
StoreItemSchema.pre('save', function(next) {
  // Auto-set availability based on stock & status
  this.isAvailable = (this.stock > 0) && (this.status === 'active');

  // Ensure originalPrice is set if missing
  if (!this.originalPrice) {
    this.originalPrice = this.price;
  }

  next();
});

/* INSTANCE METHODS */

/**
 * Safely update stock by delta (positive or negative)
 * Returns updated doc.
 */
StoreItemSchema.methods.updateStock = async function(delta) {
  const newStock = this.stock + delta;
  if (newStock < 0) throw new Error('Resulting stock cannot be negative');
  this.stock = newStock;
  this.isAvailable = this.stock > 0 && this.status === 'active';
  await this.save();
  return this;
};

/**
 * Record sale and decrement stock atomically (basic)
 * quantity should be positive integer
 */
StoreItemSchema.methods.recordSale = async function(quantity = 1) {
  if (quantity <= 0) throw new Error('Quantity must be > 0');
  if (this.stock < quantity) throw new Error('Insufficient stock');
  this.stock -= quantity;
  this.salesCount = (this.salesCount || 0) + quantity;
  this.isAvailable = this.stock > 0 && this.status === 'active';
  await this.save();
  return this;
};

/* STATIC HELPERS */

/**
 * Find available items by category, with optional limit
 */
StoreItemSchema.statics.findByCategory = function(category, limit = 50) {
  return this.find({ category, status: 'active', isAvailable: true }).limit(limit);
};

StoreItemSchema.statics.findLowStock = function(threshold = 10) {
  return this.find({ stock: { $lte: threshold }, status: 'active' });
};

StoreItemSchema.statics.findTrending = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ views: -1, salesCount: -1 })
    .limit(limit);
};

const StoreItem = model('StoreItem', StoreItemSchema);
module.exports = StoreItem;