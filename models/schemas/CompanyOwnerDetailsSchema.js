const mongoose = require('mongoose');
const { Schema } = mongoose;
const { parsePhoneNumberWithError } = require('libphonenumber-js');

// Subschema for Company Owner Details
const CompanyOwnerDetailsSchema = new Schema(
  {
    // Owner Full Name
    ownerFullName: {
      type: String,
      required: true,
      trim: true,
    },

    // Owner ID Number
    ownerIdNumber: {
      type: String,
      unique: true,
      required: true,
      validate: {
        validator: (v) => /^[0-9]{8,15}$/.test(v),
        message: (props) => `${props.value} is not a valid ID number!`,
      },
    },

    // Owner Passport Number (optional)
    ownerPassportNumber: {
      type: String,
      trim: true,
      default: null,
    },

    // Owner Address (optional)
    ownerAddress: {
      type: String,
      trim: true,
      default: null,
    },

    // Owner Phone Number
    ownerPhone: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          try {
            const phoneNumber = parsePhoneNumberWithError(v, 'AE'); // Default country: UAE
            return phoneNumber.isValid();
          } catch (err) {
            return false;
          }
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },

    // Owner Email
    ownerEmail: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v),
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
  },
  { timestamps: true }
);

module.exports = CompanyOwnerDetailsSchema;