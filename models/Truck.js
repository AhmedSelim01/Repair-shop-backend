// models/Truck.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const TruckSchema = new Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number, min: 1900, max: new Date().getFullYear() },

    status: {
      type: String,
      enum: ['pending', 'in-repair', 'quality_check', 'repaired', 'archived'],
      default: 'pending'
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },

    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },

    jobCards: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobCard'
    }],

    repairMilestones: [
      {
        stage: {
          type: String,
          enum: [
            'inspection',
            'repair in progress',
            'quality check',
            'ready for pick-up'
          ]
        },
        completedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = model('Truck', TruckSchema);