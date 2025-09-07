const mongoose = require('mongoose');
const { Schema } = mongoose;

const TruckSchema = new Schema({
    // Basic info
    licensePlate: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[A-Z0-9-]{2,11}$/.test(v);
            },
            message: props => `${props.value} is not a valid license plate!`
        }
    },
    brand: {
        type: String,
        required: true,
        trim: true
    },

    // Ownership
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    },

    // Repair info
    repairHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'JobCard'
    }],
    currentJobCardId: {
        type: Schema.Types.ObjectId,
        ref: 'JobCard'
    },
    status: {
        type: String,
        enum: ['pending', 'finalized'],
        default: 'pending'
    },
    repairMilestones: [
        {
            stage: {
                type: String,
                required: true,
                enum: ['inspection', 'repair in progress', 'quality check', 'ready for pick-up']
            },
            completedAt: {
                type: Date
            }
        }
    ]
}, {
    timestamps: true
});

// Create Truck model
const Truck = mongoose.model('Truck', TruckSchema);
module.exports = Truck;