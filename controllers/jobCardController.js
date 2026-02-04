const asyncHandler = require('express-async-handler');
const JobCard = require('../models/JobCard');
const Truck = require('../models/Truck');
const Company = require('../models/Company');

// ------------------------------------------------------
// CREATE JOB CARD
// ------------------------------------------------------
exports.createJobCard = asyncHandler(async (req, res) => {
  const { truckId, description, driverName, driverPhone, companyId } = req.body;

  if (!truckId || !description) {
    return res.status(400).json({ success: false, message: 'TruckId and description are required.' });
  }

  const truck = await Truck.findById(truckId);
  if (!truck) {
    return res.status(404).json({ success: false, message: 'Truck does not exist.' });
  }

  if (companyId) {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company does not exist.' });
    }
  }

  const jobCard = await JobCard.create({
    truckId,
    truckOwnerId: truck.owner,
    companyId: companyId || null,
    description,
    driverName,
    driverPhone,
    status: 'checking',
  });

  // Sync truck
  truck.currentJobCardId = jobCard._id;
  truck.status = 'in-repair';
  await truck.save();

  res.status(201).json({
    success: true,
    message: 'Job card created successfully.',
    jobCard,
  });
});

// ------------------------------------------------------
// GET ALL JOB CARDS
// ------------------------------------------------------
exports.getAllJobCards = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = {};
  if (status) filter.status = status;

  const total = await JobCard.countDocuments(filter);

  const jobCards = await JobCard.find(filter)
    .populate('truckId', 'licensePlate model year')
    .populate('companyId', 'companyName')
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    success: true,
    metadata: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
    data: jobCards,
  });
});

// ------------------------------------------------------
// GET JOB CARD BY ID
// ------------------------------------------------------
exports.getJobCardById = asyncHandler(async (req, res) => {
  const jobCard = await JobCard.findById(req.params.id)
    .populate('truckId', 'licensePlate model year')
    .populate('companyId', 'companyName');

  if (!jobCard) {
    return res.status(404).json({ success: false, message: 'Job card not found.' });
  }

  res.status(200).json({ success: true, jobCard });
});

// ------------------------------------------------------
// UPDATE JOBCARD (NOT STATUS)
// ------------------------------------------------------
exports.updateJobCard = asyncHandler(async (req, res) => {
  const { description, driverName, driverPhone, companyId } = req.body;

  const jobCard = await JobCard.findById(req.params.id);
  if (!jobCard) {
    return res.status(404).json({ success: false, message: 'Job card not found.' });
  }

  if (description) jobCard.description = description;
  if (driverName) jobCard.driverName = driverName;
  if (driverPhone) jobCard.driverPhone = driverPhone;
  if (companyId) jobCard.companyId = companyId;

  const updatedJobCard = await jobCard.save();

  res.status(200).json({
    success: true,
    message: 'Job card updated.',
    jobCard: updatedJobCard,
  });
});

// ------------------------------------------------------
// DELETE JOB CARD
// ------------------------------------------------------
exports.deleteJobCard = asyncHandler(async (req, res) => {
  const jobCard = await JobCard.findById(req.params.id);
  if (!jobCard) {
    return res.status(404).json({ success: false, message: 'Job card not found.' });
  }

  const truck = await Truck.findById(jobCard.truckId);
  if (truck && truck.currentJobCardId?.toString() === jobCard._id.toString()) {
    truck.currentJobCardId = null;
    await truck.save();
  }

  await jobCard.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Job card deleted successfully.',
  });
});

// ------------------------------------------------------
// UPDATE STATUS + SYNC TRUCK
// ------------------------------------------------------
exports.updateJobCardStatus = asyncHandler(async (req, res) => {
  const { status, message } = req.body;

  const jobCard = await JobCard.findById(req.params.id);
  if (!jobCard) {
    return res.status(404).json({ success: false, message: 'Job card not found.' });
  }

  jobCard.addStatusUpdate(status, message || '', req.user?.id);
  await jobCard.save();

  const truck = await Truck.findById(jobCard.truckId);
  if (!truck) {
    return res.status(404).json({ success: false, message: 'Associated truck not found.' });
  }

  switch (status) {
    case 'checking':
      truck.status = 'pending';
      break;
    case 'repair_in_progress':
      truck.status = 'in-repair';
      break;
    case 'ready_for_pickup':
      truck.status = 'ready-for-pickup';
      break;
    case 'completed':
      truck.status = 'repaired';
      truck.currentJobCardId = null;
      if (!truck.repairHistory.includes(jobCard._id)) {
        truck.repairHistory.push(jobCard._id);
      }
      break;
    case 'archived':
      truck.status = 'archived';
      truck.currentJobCardId = null;
      break;
  }

  await truck.save();

  res.status(200).json({
    success: true,
    message: 'Job card and truck updated.',
    jobCard,
    truck,
  });
});