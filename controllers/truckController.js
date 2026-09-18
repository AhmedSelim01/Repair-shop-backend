// controllers/truckController.js
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Truck = require('../models/Truck');
const User = require('../models/User');
const Company = require('../models/Company');
const JobCard = require('../models/JobCard');

const validStages = ['inspection', 'repair in progress', 'quality check', 'ready for pick-up'];

async function getActiveJobCard(truckId) {
  return await JobCard.findOne({
    truckId,
    isCompleted: false
  })
    .sort({ createdAt: -1 })
    .populate('truckId')
    .populate('ownerId')
    .populate('companyId')
    .populate('workedOnBy.employeeId');
}

exports.createTruck = asyncHandler(async (req, res) => {
  const { licensePlate, brand, model, year, companyId } = req.body;

  if (!licensePlate || !brand || !model || !year) {
    return res.status(400).json({ success: false, message: 'licensePlate, brand, model, and year are required.' });
  }

  const existingTruck = await Truck.findOne({ licensePlate: licensePlate.toUpperCase().trim() });
  if (existingTruck) return res.status(409).json({ success: false, message: 'Truck with this license plate already exists.' });

  const truckData = {
    licensePlate: licensePlate.toUpperCase().trim(),
    brand,
    model,
    year,
    owner: req.user._id,
    status: 'pending'
  };

  if (companyId) {
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    truckData.companyId = companyId;
  }

  const truck = await Truck.create(truckData);

  await User.findByIdAndUpdate(req.user._id, { $push: { trucks: truck._id } });

  if (companyId) {
    await Company.findByIdAndUpdate(companyId, { $push: { associatedTrucks: truck._id } });
  }

  res.status(201).json({ success: true, message: 'Truck registered successfully.', truck });
});

exports.getAllTrucks = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);

  const totalTrucks = await Truck.countDocuments();

  const trucks = await Truck.find()
    .populate('owner', 'name email phone')
    .populate('companyId', 'companyName')
    .populate('jobCards', 'status startDate endDate')
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, metadata: { total: totalTrucks, currentPage: page, totalPages: Math.ceil(totalTrucks / limit) }, data: trucks });
});

exports.getTruckById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid truck ID' });

  const truck = await Truck.findById(id)
    .populate('owner', 'name email phone')
    .populate('companyId', 'companyName')
    .populate('jobCards', 'status startDate endDate');

  if (!truck) return res.status(404).json({ success: false, message: 'Truck not found' });

  res.status(200).json({ success: true, truck });
});

exports.updateTruck = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { brand, model, status } = req.body;

  const truck = await Truck.findById(id);
  if (!truck) return res.status(404).json({ success: false, message: 'Truck not found' });

  const isOwner = truck.owner.toString() === req.user._id.toString();
  const isCompany = truck.companyId?.toString() === req.user.companyId?.toString();

  if (!isOwner && !isCompany && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to update this truck.' });
  }

  if (brand) truck.brand = brand;
  if (model) truck.model = model;
  if (status && ['pending','in-repair','quality_check','repaired','archived'].includes(status)) truck.status = status;

  const updatedTruck = await truck.save();

  res.status(200).json({ success: true, message: 'Truck updated successfully.', truck: updatedTruck });
});

exports.deleteTruck = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const truck = await Truck.findById(id);
  if (!truck) return res.status(404).json({ success: false, message: 'Truck not found' });

  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only admin can delete trucks.' });

  await User.findByIdAndUpdate(truck.owner, { $pull: { trucks: truck._id } });

  if (truck.companyId) {
    await Company.findByIdAndUpdate(truck.companyId, { $pull: { associatedTrucks: truck._id } });
  }

  await truck.deleteOne();

  res.status(200).json({ success: true, message: 'Truck deleted successfully.' });
});

exports.updateTruckRepairStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stage } = req.body;

  if (!validStages.includes(stage)) return res.status(400).json({ success: false, message: 'Invalid repair stage.' });

  const truck = await Truck.findById(id);
  if (!truck) return res.status(404).json({ success: false, message: 'Truck not found' });

  truck.repairMilestones.push({ stage, completedAt: new Date() });

  if (stage === 'ready for pick-up') truck.status = 'repaired';

  const updatedTruck = await truck.save();

  res.status(200).json({ success: true, message: 'Repair status updated.', truck: updatedTruck });
});

exports.getActiveJobCardForTruck = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid truck ID' });

  const truck = await Truck.findById(id);
  if (!truck) return res.status(404).json({ success: false, message: 'Truck not found' });

  const jobCard = await getActiveJobCard(id);

  if (!jobCard) {
    return res.status(200).json({ success: true, active: false, message: 'No active job card for this truck.' });
  }

  return res.status(200).json({ success: true, active: true, jobCard });
});