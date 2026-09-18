const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

// Middleware to validate MongoDB ObjectId
exports.validateObjectId = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }
    next();
});

// Middleware to validate fields based on user role
exports.validateUserFields = asyncHandler(async (req, res, next) => {
    const { role, name, licensePlate, associatedTrucks, companyName, licenseDetails, ownerDetails,driverInfo,companyDetails } = req.body;

    const errors = [];

    // Basic validation for all roles
    if (['general', 'truck_owner', 'company_driver', 'unregistered_driver'].includes(role) && !name) {
        errors.push('Name is required for this role.');
    }

    switch (role) {
        case 'truck_owner':
            if (!licensePlate) {
                errors.push('License plate is required for truck owners.');
            }
            if (!associatedTrucks?.length) {
                errors.push('Associated trucks are required for truck owners.');
            }
            break;

        case 'company':
            if (!companyName) {
                errors.push('Company name is required.');
            }
            if (!licenseDetails) {
                errors.push('License details are required.');
            }
            if (!ownerDetails) {
                errors.push('Owner details are required.');
            }
            break;

        case 'company_driver':
            if (!driverInfo?.name || !driverInfo?.phoneNumber) {
                errors.push('Driver name and phone number are required.');
            }
            if (!companyName) {
                errors.push('Company name is required for company drivers.');
            }
            break;

        case 'unregistered_driver':
            if (!driverInfo?.name || !driverInfo?.phoneNumber) {
                errors.push('Driver name and phone number are required.');
            }
            if (!companyDetails?.companyName || !companyDetails?.contactPerson) {
                errors.push('Company details are required for unregistered drivers.');
            }
            break;
    }

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
});