const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Subschema for Company Bank Details
 * Can be included in the Company model as:
 * bankDetails: { type: [BankDetailsSchema], default: [] }
 */
const BankDetailsSchema = new Schema(
  {
    // Bank Name
    bankName: {
      type: String,
      required: true,
      trim: true,
    },

    // Branch Name (optional)
    branchName: {
      type: String,
      trim: true,
      default: null,
    },

    // Bank Address (optional)
    address: {
      type: String,
      trim: true,
      default: null,
    },

    // Account Name
    accountName: {
      type: String,
      required: true,
      trim: true,
    },

    // Currency Type
    currencyType: {
      type: String,
      required: true,
      enum: ['AED', 'USD', 'EUR', 'GBP', 'Others'],
      default: 'AED', // Default to UAE Dirham
    },

    // IBAN
    iban: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (v) => /^[A-Z0-9]{15,34}$/.test(v),
        message: (props) => `${props.value} is not a valid IBAN!`,
      },
    },

    // SWIFT/BIC Code
    swiftCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (v) => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v),
        message: (props) => `${props.value} is not a valid SWIFT code!`,
      },
    },
  },
  { timestamps: true }
);

module.exports = BankDetailsSchema;