// models/Driver.js
const mongoose = require('mongoose');
const { parsePhoneNumberWithError } = require('libphonenumber-js');

const DriverSchema = new mongoose.Schema({
  driverName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  driverPhone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(value) {
        try {
          return parsePhoneNumberWithError(value, 'AE').isValid();
        } catch {
          return false;
        }
      },
      message: 'Driver phone must be a valid international number.'
    }
  },
  driverIdNumber: { type: String, required: true, unique: true, trim: true },
  truckNumber: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  licenseInfo: {
    licenseNumber: { type: String, required: true },
    licenseExpiry: {
      type: Date,
      required: true,
      validate: {
        validator: value => value > new Date(),
        message: 'License expiry date must be in the future.'
      }
    },
    licenseType: { type: String, required: true, enum: ['light', 'heavy', 'commercial'] }
  },
  isActive: { type: Boolean, default: true },
  rating: { type: Number, min: 1, max: 5, default: null },
  totalJobs: { type: Number, default: 0 },
  associatedCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  externalCompanyDetails: {
    companyName: String,
    contactPerson: String,
    contactPhone: String
  },
  emergencyContact: {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(value) {
          try {
            return parsePhoneNumberWithError(value, 'AE').isValid();
          } catch {
            return false;
          }
        },
        message: 'Emergency contact phone must be valid.'
      }
    },
    relationship: { type: String, required: true, enum: ['spouse', 'parent', 'sibling', 'child', 'friend', 'other'] }
  }
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);