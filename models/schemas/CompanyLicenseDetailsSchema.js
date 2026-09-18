const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subschema for Company License Details
const CompanyLicenseDetailsSchema = new Schema(
  {
    // Company Full Name
    companyFullName: {
      type: String,
      required: true,
      trim: true,
    },

    // Company License Number
    companyLicenseNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Each license number must be unique
    },

    // License Type
    licenseType: {
      type: String,
      enum: ['Commercial', 'Industrial', 'Service', 'Other'],
      required: true,
    },

    // Issuing Authority
    issuingAuthority: {
      type: String,
      required: true,
      trim: true,
    },

    // Tax Registration Number (TRN)
    TRN: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Creation Date (cannot be in the future)
    creationDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v <= new Date();
        },
        message: 'License creation date cannot be in the future!',
      },
    },

    // Expiry Date (must be in the future)
    expiryDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v > new Date();
        },
        message: 'License has already expired!',
      },
    },
  },
  { timestamps: true }
);

module.exports = CompanyLicenseDetailsSchema;