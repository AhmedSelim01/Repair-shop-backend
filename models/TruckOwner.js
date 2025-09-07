const mongoose = require('mongoose');

const TruckOwnerSchema = new mongoose.Schema(
    {
        // User Reference
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        // License Plate
        licensePlate: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: function(v) {
                    return /^[A-Z0-9-]{2,11}$/.test(v);
                },
                message: props => `${props.value} is not a valid license plate!`
            }
        },
        // Associated Trucks
        associatedTrucks: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Truck'
        }]
    },
    { timestamps: true }
);

// Indexes
TruckOwnerSchema.index({ userId: 1 });
TruckOwnerSchema.index({ licensePlate: 1 });

// Create TruckOwner model
const TruckOwner = mongoose.model('TruckOwner', TruckOwnerSchema);
module.exports = TruckOwner;