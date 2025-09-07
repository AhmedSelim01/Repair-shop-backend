const mongoose = require('mongoose');
const { Schema } = mongoose;

const JobCardSchema = new Schema({
    // Truck Reference
    truckId: {
        type: Schema.Types.ObjectId,
        ref: 'Truck',
        required: true,
        unique: true,
    },
    // Entry Date
    entryDate: {
        type: Date,
        default: Date.now,
    },
    // Description of Repairs
    description: [{
        partName: { 
            type: String, 
            required: true, 
            trim: true, 
        },
        partCost: { 
            type: Number, 
            required: true, 
            min: 0,
        },
        repairFee: { 
            type: Number, 
            required: true, 
            min: 0, 
        },
    }],
    // Status of the Job Card
    status: {
        type: String,
        enum: ['in-progress', 'completed', 'archived'],
        default: 'in-progress',
    },
    // Completed Date
    completedDate: {
        type: Date,
        default: null,
    },
    // Driver Information (required if companyId is provided)
    driverName: {
        type: String,
        required: function () { 
            return this.companyId !== null; 
        },
        trim: true,
    },
    driverPhone: {
        type: String,
        required: function () { 
            return this.companyId !== null; 
        },
        validate: {
            validator: function(v) {
                return /^[0-9]{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`,
        },
    },
    // Company Reference (required if driverName and driverPhone are provided)
    companyId: {
        type: Schema.Types.ObjectId,
        unique: true,
        ref: 'User',
        required: function() {
            return this.driverName && this.driverPhone;
        }
    },
}, {
    timestamps: true,
});

// Create JobCard model
const JobCard = mongoose.model('JobCard', JobCardSchema);
module.exports = JobCard;