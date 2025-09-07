// Import required dependencies for User model
const mongoose = require('mongoose'); // MongoDB ODM
const bcrypt = require('bcryptjs'); // For password hashing
const Company = require('./Company'); // Reference to Company model
const {v4: uuidv4 } = require('uuid'); // For generating unique reset codes
const { parsePhoneNumberWithError } = require('libphonenumber-js'); // International phone validation

/**
 * USER SCHEMA DEFINITION
 * Central user model supporting multiple roles in the repair shop system
 * Includes validation, security features, and role-based field requirements
 */
const UserSchema = new mongoose.Schema(
  {
    // ===== BASIC USER INFORMATION =====
    name: { 
      type: String, 
      trim: true, // Removes whitespace from beginning and end
      required: function() {
        // CONDITIONAL REQUIREMENT: Name required for specific roles only
        // Admin users don't need names as they're system accounts
        return ['general', 'employee', 'truck_owner'].includes(this.role);
      }
    },
    email: {
      type: String,
      unique: true, // Prevents duplicate email addresses
      lowercase: true, // Automatically converts to lowercase for consistency
      required: true,
      validate: {
        // REGEX VALIDATION: Ensures proper email format
        validator: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
        message: 'Invalid email format.'
      }
    },
    phone: {
      type: String,
      unique: true, // Each phone number can only be used once
      required: function() {
        // BUSINESS RULE: Phone required for all roles except admin
        // Admins are internal users who don't need phone contact
        return this.role !== "admin";
      },
      validate: {
        validator: function(value) {
          if (!value) return true; // Allow empty for admin users
          try {
            // INTERNATIONAL PHONE VALIDATION using libphonenumber-js
            // Defaults to UAE (AE) country code for regional business
            const phoneNumber = parsePhoneNumberWithError(value, 'AE');
            return phoneNumber.isValid();
          } catch (err) {
            console.error('Phone must be a valid international number:', err);
            return false;
          }
        },
      },
    },
    password: { 
      type: String, 
      required: true, 
      minlength: 8, // Minimum security requirement
      validate: {
        validator: function(value) {
          // STRONG PASSWORD POLICY: Requires uppercase, lowercase, number, and special character
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          return passwordRegex.test(value);
        },
        message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      }
    },

    // Role-Specific Info
    licensePlate: {
      type: String,
      required: function() {
        // License plate is required for truck owners
        return this.role === 'truck_owner';
      },
      validate: {
        validator: (value) => /^[A-Z0-9-]{2,11}$/.test(value),
        message: 'License plate must be 2-11 characters (A-Z, 0-9, hyphens)'
      }
    },
    role: {
      type: String,
      enum: ['general', 'truck_owner', 'company', 'admin', 'employee'],
      default: 'general'
    },
    associatedTrucks: [mongoose.Schema.Types.ObjectId],
    truckOwnerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'TruckOwner', 
      default: null 
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      validate: {
        validator: async function(value) {
          try {
            // Validate companyId if the role is 'company'
            if (this.role === 'company' && !value) return false;
            return !value || await Company.exists({ _id: value });
          } catch (err) {
            console.error('Invalid companyId or company does not exist:', err);
            return false;
          }
        },
      },
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true
    },

    // Reset Password
    resetCode: { 
      type: String, 
      default: null 
    },
    resetCodeExpires: { 
      type: Date, 
      default: null 
    }
  },
  { 
    timestamps: { createdAt: true, updatedAt: true } 
  }
);

// Indexes
UserSchema.index({ role: 1 });

/**
 * PRE-SAVE MIDDLEWARE: PASSWORD HASHING
 * Automatically hashes passwords before saving to database
 * Only runs when password is modified to avoid unnecessary hashing
 */
UserSchema.pre('save', async function(next) {
  // Skip hashing if password hasn't been modified (for other field updates)
  if (!this.isModified('password')) return next();
  
  // Generate salt for bcrypt (10 rounds = good balance of security vs performance)
  const salt = await bcrypt.genSalt(10);
  
  // Hash the password with the generated salt
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * INSTANCE METHOD: PASSWORD COMPARISON
 * Compares plain text password with hashed password in database
 * Used during login authentication
 * @param {String} enteredPassword - Plain text password from login form
 * @returns {Boolean} - True if passwords match, false otherwise
 */
UserSchema.methods.matchPassword = async function(enteredPassword) {
  // bcrypt.compare handles the hashing and comparison securely
  return bcrypt.compare(enteredPassword, this.password);
};

// Method to generate a reset code
UserSchema.methods.generateResetCode = function() {
  const resetCode = uuidv4();
  this.resetCode = resetCode;
  this.resetCodeExpires = Date.now() + 3600000; // Reset code expires in 1 hour
  return resetCode;
};

// Method to get the country flag for the phone number
UserSchema.methods.getCountryFlag = function() {
  try {
    const phoneNumber = parsePhoneNumberWithError(this.phone, 'AE'); // Default to 'UAE' if no country code is provided
    const countryCallingCode = phoneNumber.countryCallingCode;
    return countryCallingCode;
  } catch (err) {
    console.error('Error parsing phone number:', err);
    return null; // Return null if the phone number is invalid
  }
};

// Create User model
const User = mongoose.model('User', UserSchema);
module.exports = User;