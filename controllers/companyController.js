// controllers/companyController.js
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Company = require('../models/Company');
const Driver = require('../models/Driver');
const Truck = require('../models/Truck');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function dedupeIds(arr = []) {
  return Array.from(new Set(arr.map(a => a?.toString()))).map(x => mongoose.Types.ObjectId(x));
}

exports.createCompany = asyncHandler(async (req, res, next) => {
  const { companyName, contactEmail } = req.body;

  if (!companyName || !contactEmail) {
    return res.status(400).json({ success: false, message: 'companyName and contactEmail are required' });
  }

  const existing = await Company.findOne({ contactEmail });
  if (existing) {
    return res.status(409).json({ success: false, message: 'A company with that contactEmail already exists' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [company] = await Company.create([{
      companyName,
      contactEmail,
      profileStatus: 'initial',
      bankDetails: [],
      licenseDetails: [],
      ownerDetails: [],
      drivers: [],
      associatedTrucks: []
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: 'Company created. Complete profile to activate.',
      company,
      nextSteps: {
        requiredFields: ['licenseDetails', 'ownerDetails'],
        endpoint: `/api/v1/companies/${company._id}/complete-profile`
      }
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
});

exports.completeProfile = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { bankDetails, licenseDetails, ownerDetails, replace = false } = req.body;

  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid company id' });
  const company = await Company.findById(id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  if (!licenseDetails || !ownerDetails) return res.status(400).json({ success: false, message: 'licenseDetails and ownerDetails are required' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (replace) {
      company.licenseDetails = licenseDetails;
      company.ownerDetails = ownerDetails;
      if (bankDetails) company.bankDetails = bankDetails;
    } else {
      const licenseMap = new Map(company.licenseDetails.map(l => [l.companyLicenseNumber?.toString() || JSON.stringify(l), l]));
      licenseDetails.forEach(l => {
        const key = l.companyLicenseNumber?.toString() || JSON.stringify(l);
        licenseMap.set(key, l);
      });
      company.licenseDetails = Array.from(licenseMap.values());

      const ownerMap = new Map(company.ownerDetails.map(o => [
        o.ownerIdNumber?.toString() || o.ownerEmail?.toString() || JSON.stringify(o), o
      ]));
      ownerDetails.forEach(o => {
        const key = o.ownerIdNumber?.toString() || o.ownerEmail?.toString() || JSON.stringify(o);
        ownerMap.set(key, o);
      });
      company.ownerDetails = Array.from(ownerMap.values());

      if (bankDetails) {
        const bankMap = new Map(company.bankDetails.map(b => [b.iban?.toString() || JSON.stringify(b), b]));
        bankDetails.forEach(b => {
          const key = b.iban?.toString() || JSON.stringify(b);
          bankMap.set(key, b);
        });
        company.bankDetails = Array.from(bankMap.values());
      }
    }

    company.profileStatus = company.bankDetails.length && company.licenseDetails.length && company.ownerDetails.length ? 'complete' : 'basic';

    const updated = await company.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, message: `Company profile ${company.profileStatus === 'complete' ? 'completed' : 'updated'} successfully.`, company: updated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
});

exports.addAssociations = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  let { drivers = [], associatedTrucks = [] } = req.body;

  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid company id' });
  if (!Array.isArray(drivers)) drivers = drivers ? [drivers] : [];
  if (!Array.isArray(associatedTrucks)) associatedTrucks = associatedTrucks ? [associatedTrucks] : [];
  if (!drivers.length && !associatedTrucks.length) return res.status(400).json({ success: false, message: 'Provide drivers or associatedTrucks to add' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const company = await Company.findById(id).session(session);
    if (!company) throw new Error('Company not found');

    const existingDrivers = await Driver.find({ _id: { $in: drivers } }).session(session);
    const existingTrucks = await Truck.find({ _id: { $in: associatedTrucks } }).session(session);

    const driverIds = dedupeIds([...company.drivers, ...existingDrivers.map(d => d._id)]);
    company.drivers = driverIds;
    await Driver.updateMany({ _id: { $in: existingDrivers.map(d => d._id) } }, { associatedCompany: company._id }, { session });

    const truckIds = dedupeIds([...company.associatedTrucks, ...existingTrucks.map(t => t._id)]);
    company.associatedTrucks = truckIds;
    await Truck.updateMany({ _id: { $in: existingTrucks.map(t => t._id) } }, { companyId: company._id }, { session });

    await company.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, message: 'Associations added', company });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
});

exports.updateCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body || {};

  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid company id' });
  const company = await Company.findById(id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  if (company.profileStatus !== 'complete' && (updates.licenseDetails || updates.ownerDetails || updates.bankDetails)) {
    return res.status(400).json({ success: false, message: 'Use complete-profile endpoint to update profile details', endpoint: `/api/v1/companies/${id}/complete-profile` });
  }

  if (updates.contactEmail && updates.contactEmail !== company.contactEmail) {
    const dup = await Company.findOne({ contactEmail: updates.contactEmail });
    if (dup) return res.status(409).json({ success: false, message: 'contactEmail already in use' });
    company.contactEmail = updates.contactEmail;
  }

  if (updates.companyName) company.companyName = updates.companyName;
  if (Array.isArray(updates.drivers) && updates.drivers.length) company.drivers = dedupeIds([...company.drivers, ...updates.drivers]);
  if (Array.isArray(updates.associatedTrucks) && updates.associatedTrucks.length) company.associatedTrucks = dedupeIds([...company.associatedTrucks, ...updates.associatedTrucks]);

  const saved = await company.save();
  return res.status(200).json({ success: true, message: 'Company updated', company: saved });
});

exports.getAllCompanies = asyncHandler(async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const total = await Company.countDocuments();
  const companies = await Company.find()
    .populate('associatedTrucks drivers')
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    metadata: { total, page, totalPages: Math.ceil(total / limit), limit },
    companies
  });
});

exports.getCompanyById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid company id' });

  const company = await Company.findById(id).populate('associatedTrucks drivers');
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  return res.status(200).json({ success: true, company });
});

exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid company id' });

  const company = await Company.findById(id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  await company.deleteOne();
  return res.status(200).json({ success: true, message: 'Company deleted' });
});