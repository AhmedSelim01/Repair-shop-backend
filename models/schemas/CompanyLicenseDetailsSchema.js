const mongoose = require('mongoose');
const { Schema } = mongoose;

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
            unique: true, // Ensure license numbers are unique
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
            unique: true, // Ensure TRN is unique
        },
        // Creation Date
        creationDate: {
            type: Date,
            required: true,
            validate: {
                validator: function (v) {
                    return v <= new Date();
                },
                message: 'License creation date cannot be in the future!',
            },
        },
        // Expiry Date
        expiryDate: {
            type: Date,
            required: true,
            validate: {
                validator: function (v) {
                    return v > new Date();
                },
                message: 'License has already expired!',
            },
        },
    },
    { timestamps: true }
);

module.exports = CompanyLicenseDetailsSchema;