// controllers/driverController.js
const asyncHandler = require('express-async-handler');
const Driver = require('../models/Driver');
const Company = require('../models/Company');

exports.createDriver = asyncHandler(async (req, res, next) => {
    try {
        const {
            driverName,
            driverPhone,
            driverIdNumber,
            licensePlate,
            emergencyContact,
            associatedCompany,
            externalCompanyDetails,
            truckNumber
        } = req.body;

        const existingDriver = await Driver.findOne({ driverIdNumber });
        if (existingDriver) {
            return res.status(400).json({ success: false, message: 'Driver with this ID number already exists.' });
        }

        const driverData = {
            driverName,
            driverPhone,
            driverIdNumber,
            truckNumber,
            userId: req.user.id,
            emergencyContact
        };

        if (associatedCompany) {
            const company = await Company.findById(associatedCompany);
            if (!company) {
                return res.status(404).json({ success: false, message: 'Associated company not found.' });
            }
            driverData.associatedCompany = associatedCompany;
            driverData.isRegisteredCompanyDriver = true;
        } else if (externalCompanyDetails) {
            driverData.externalCompanyDetails = externalCompanyDetails;
            driverData.isRegisteredCompanyDriver = false;
        }

        const driver = await Driver.create(driverData);

        if (associatedCompany) {
            await Company.findByIdAndUpdate(associatedCompany, { $push: { drivers: driver._id } });
        }

        res.status(201).json({ success: true, message: 'Driver created successfully.', driver });
    } catch (error) {
        next(error);
    }
});

exports.getAllDrivers = asyncHandler(async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const drivers = await Driver.find()
            .populate('associatedCompany', 'companyName contactEmail')
            .populate('userId', 'name email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Driver.countDocuments();

        res.status(200).json({
            success: true,
            metadata: { total, page, totalPages: Math.ceil(total / limit), limit },
            drivers
        });
    } catch (error) {
        next(error);
    }
});

exports.getDriverById = asyncHandler(async (req, res, next) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('associatedCompany', 'companyName contactEmail')
            .populate('userId', 'name email');

        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

        res.status(200).json({ success: true, driver });
    } catch (error) {
        next(error);
    }
});

exports.updateDriver = asyncHandler(async (req, res, next) => {
    try {
        const { driverName, driverPhone, licensePlate, emergencyContact, externalCompanyDetails, truckNumber } = req.body;

        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

        if (driverName) driver.driverName = driverName;
        if (driverPhone) driver.driverPhone = driverPhone;
        if (licensePlate) driver.truckNumber = licensePlate;
        if (emergencyContact) driver.emergencyContact = emergencyContact;
        if (externalCompanyDetails) driver.externalCompanyDetails = externalCompanyDetails;
        if (truckNumber) driver.truckNumber = truckNumber;

        const updatedDriver = await driver.save();

        res.status(200).json({ success: true, message: 'Driver updated successfully.', driver: updatedDriver });
    } catch (error) {
        next(error);
    }
});

exports.deleteDriver = asyncHandler(async (req, res, next) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

        if (driver.associatedCompany) {
            await Company.findByIdAndUpdate(driver.associatedCompany, { $pull: { drivers: driver._id } });
        }

        await driver.deleteOne();

        res.status(200).json({ success: true, message: 'Driver deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

exports.getCompanyDrivers = asyncHandler(async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const drivers = await Driver.find({ associatedCompany: companyId, isRegisteredCompanyDriver: true });

        res.status(200).json({ success: true, count: drivers.length, drivers });
    } catch (error) {
        next(error);
    }
});