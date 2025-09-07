const mongoose = require('mongoose');
const { parsePhoneNumberWithError } = require('libphonenumber-js');

const DriverSchema = new mongoose.Schema({
  driverName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  driverPhone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(value) {
        try {
          const phoneNumber = parsePhoneNumberWithError(value, 'AE');
          return phoneNumber.isValid();
        } catch (error) {
          console.debug('Phone validation failed silently:', error.message);

          return false;
        }
      },
      message: 'Phone must be a valid international number.'
    }
  },
  driverIdNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  licensePlate: {
    type: String,
    required: true,
    validate: {
      validator: (value) => /^[A-Z0-9-]{2,11}$/.test(value),
      message: 'License plate must be 2-11 characters (A-Z, 0-9, hyphens)'
    }
  },
  emergencyContact: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(value) {
          try {
            const phoneNumber = parsePhoneNumberWithError(value, 'AE');
            return phoneNumber.isValid();
          } catch {
            return false;
          }
        },
        message: 'Emergency contact phone must be valid.'
      }
    },
    relationship: {
      type: String,
      required: true,
      enum: ['spouse', 'parent', 'sibling', 'child', 'friend', 'other']
    }
  },
  associatedCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  externalCompanyDetails: {
    companyName: String,
    contactPerson: String,
    contactPhone: String
  },
  truckNumber: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  licenseInfo: {
    licenseNumber: {
      type: String,
      required: true
    },
    licenseExpiry: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          return value > new Date();
        },
        message: 'License expiry date must be in the future.'
      }
    },
    licenseType: {
      type: String,
      required: true,
      enum: ['light', 'heavy', 'commercial']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  totalJobs: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', DriverSchema);
