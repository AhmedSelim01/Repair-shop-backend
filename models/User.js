// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { parsePhoneNumberWithError } = require('libphonenumber-js');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: false,
      index: true,
      sparse: true // allow missing phones
    },

    password: {
      type: String,
      required: true,
      minlength: 8
    },

    role: {
      type: String,
      enum: ['general', 'truck_owner', 'company', 'employee', 'admin', 'company_driver', 'unregistered_driver'],
      default: 'general'
    },

    trucks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Truck'
    }],

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    resetCode: { type: String, default: null },
    resetCodeExpires: { type: Date, default: null },

    // small role-scoped objects
    driverInfo: { type: mongoose.Schema.Types.Mixed, default: null },
    companyDetails: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Normalize phone to E.164 on validate if provided
UserSchema.pre('validate', function (next) {
  if (this.phone) {
    try {
      const parsed = parsePhoneNumberWithError(this.phone, 'AE');
      this.phone = parsed.number; // E.164
    } catch (err) {
      return next(new Error('Invalid phone number for AE (expect international/E.164 or local).'));
    }
  }
  next();
});

// Hash password
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Instance methods
UserSchema.methods.matchPassword = function(password) {
  return bcrypt.compare(password, this.password);
};

// Return a safe public profile object
UserSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    trucks: this.trucks,
    companyId: this.companyId,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Remove sensitive fields when converting to JSON
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetCode;
  delete obj.resetCodeExpires;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);