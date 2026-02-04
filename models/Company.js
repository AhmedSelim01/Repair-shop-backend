// models/Company.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const BankDetailsSchema = require('./schemas/BankDetailsSchema');
const CompanyLicenseDetailsSchema = require('./schemas/CompanyLicenseDetailsSchema');
const CompanyOwnerDetailsSchema = require('./schemas/CompanyOwnerDetailsSchema');

const CompanySchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true },

    contactEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    profileStatus: {
      type: String,
      enum: ['initial', 'basic', 'complete'],
      default: 'initial'
    },

    bankDetails: [BankDetailsSchema],
    licenseDetails: [CompanyLicenseDetailsSchema],
    ownerDetails: [CompanyOwnerDetailsSchema],

    drivers: [{
      type: Schema.Types.ObjectId,
      ref: 'Driver'
    }],

    associatedTrucks: [{
      type: Schema.Types.ObjectId,
      ref: 'Truck'
    }],

    associatedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  { timestamps: true }
);

module.exports = model('Company', CompanySchema);