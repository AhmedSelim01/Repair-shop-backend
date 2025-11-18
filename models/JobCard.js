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
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        spares: true,
        defualt: null
    },

    // Driver Information
    driverName: {
        type: String,
        trim: true,
        required: function () { 
            return !!this.companyId; 
        },
    },
    driverPhone: {
        type: String,
        required: function () { 
            return !!this.companyId; 
        },
        validate: {
            validator: function(v) {
                if(!v & !this.companyId) return true;
                return /^[0-9]{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid 10-digit phone number!`,
        },
    },
}, {
    timestamps: true,
});

// Create JobCard model
const JobCard = mongoose.model('JobCard', JobCardSchema);
module.exports = JobCard;