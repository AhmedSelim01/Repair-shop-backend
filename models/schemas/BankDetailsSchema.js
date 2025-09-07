const mongoose = require('mongoose');
const { Schema } = mongoose;

const BankDetailsSchema = new Schema(
    {
        // Bank Name
        bankName: {
            type: String,
            required: true,
            trim: true,
        },
        // Branch Name
        branchName: {
            type: String,
            trim: true,
        },
        // Address
        address: {
            type: String,
            trim: true,
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
            default: 'AED', // Set default currency to UAE Dirham (AED)
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
        // SWIFT Code
        swiftCode: {
            type: String,
            unique: true,
            required: true,
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