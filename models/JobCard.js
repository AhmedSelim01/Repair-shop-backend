const mongoose = require('mongoose');

const statusUpdateSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
});

const jobCardSchema = new mongoose.Schema(
  {
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
    truckOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },

    description: { type: String, required: true },
    driverName: { type: String },
    driverPhone: { type: String },

    status: {
      type: String,
      enum: ['checking', 'repair_in_progress', 'ready_for_pickup', 'completed', 'archived'],
      default: 'checking',
    },

    statusUpdates: [statusUpdateSchema],
  },
  { timestamps: true }
);

// Method: Add status update
jobCardSchema.methods.addStatusUpdate = function (status, message, updatedBy) {
  this.status = status;
  this.statusUpdates.push({ status, message, updatedBy });
};

module.exports = mongoose.model('JobCard', jobCardSchema);