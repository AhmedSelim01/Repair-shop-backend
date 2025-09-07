const mongoose = require('mongoose');
const BankDetailsSchema = require('./schemas/BankDetailsSchema');
const CompanyLicenseDetailsSchema = require('./schemas/CompanyLicenseDetailsSchema');
const CompanyOwnerDetailsSchema = require('./schemas/CompanyOwnerDetailsSchema');
const { Schema, model } = mongoose;

const CompanySchema = new Schema(
    {
        // Basic Info
        truckOwnerId: { type: Schema.Types.ObjectId, ref: 'TruckOwner', required: false },
        companyName: { type: String, required: true, trim: true },
        contactEmail: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v),
                message: (props) => `${props.value} is not a valid email address!`
            }
        },

        // Profile Details
        profileStatus: {
            type: String,
            enum: ['initial', 'basic', 'complete'],
            default: 'initial'
        },
        bankDetails: { type: [BankDetailsSchema], default: [] },
        licenseDetails: { type: [CompanyLicenseDetailsSchema], default: [] },
        ownerDetails: { type: [CompanyOwnerDetailsSchema], default: [] },

        // Associations
        drivers: { type: [Schema.Types.ObjectId], ref: 'Driver', default: [] },
        associatedTrucks: { type: [Schema.Types.ObjectId], ref: 'Truck', default: [] }
    },
    { timestamps: true }
);

// Create Company model
const Company = model('Company', CompanySchema);
module.exports = Company;