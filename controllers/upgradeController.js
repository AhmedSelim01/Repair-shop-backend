// controllers/upgradeController.js
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Truck = require('../models/Truck');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

function createToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, companyId: user.companyId || null }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /api/users/upgrade/truck-owner
exports.upgradeToTruckOwner = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { licensePlate, brand } = req.body;

  if (!licensePlate) return res.status(400).json({ success: false, message: 'License plate is required.' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    if (user.role === 'company') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Company accounts cannot downgrade to truck_owner.' });
    }

    const plateNormalized = licensePlate.toUpperCase().trim();
    let truck = await Truck.findOne({ licensePlate: plateNormalized }).session(session);

    if (truck) {
      if (truck.owner && truck.owner.toString() !== userId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'This truck is already registered under another owner.' });
      }
      truck.owner = user._id;
      if (brand) truck.brand = brand;
      await truck.save({ session });
    } else {
      const created = await Truck.create([{
        licensePlate: plateNormalized,
        brand: brand || null,
        owner: user._id,
        status: 'pending'
      }], { session });
      truck = created[0];
    }

    user.role = 'truck_owner';
    user.trucks = user.trucks || [];
    if (!user.trucks.map(String).includes(truck._id.toString())) user.trucks.push(truck._id);

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    const token = createToken(user);

    return res.status(200).json({ success: true, message: 'Upgraded to truck_owner', user: user.getPublicProfile(), token });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// POST /api/users/upgrade/company
exports.upgradeToCompany = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const {
    companyName,
    contactEmail,
    companyPhone,
    licenseDetails,
    companyType,
    bankDetails,
    ownerDetails
  } = req.body;

  if (!companyName || !contactEmail || !companyPhone) {
    return res.status(400).json({ success: false, message: 'companyName, contactEmail and companyPhone are required.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    if (user.role === 'company') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'User is already a company.' });
    }

    const [company] = await Company.create([{
      companyName,
      contactEmail: contactEmail.toLowerCase().trim(),
      profileStatus: 'initial',
      bankDetails: bankDetails || [],
      licenseDetails: licenseDetails || [],
      ownerDetails: ownerDetails ? ownerDetails.map(d => ({ ...d })) : [],
      drivers: [],
      associatedTrucks: [],
      associatedUsers: [user._id]
    }], { session });

    user.role = 'company';
    user.companyId = company._id;

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    const token = createToken(user);

    return res.status(200).json({ success: true, message: 'Upgraded to company', company, user: user.getPublicProfile(), token });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});