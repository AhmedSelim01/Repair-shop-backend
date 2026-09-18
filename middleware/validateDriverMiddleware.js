// middlewares/driverValidation.js
const Company = require('../models/Company');
const asyncHandler = require('express-async-handler');
exports.validateDriverTransition = asyncHandler(async (req, res, next) => {
    const { role, driverInfo, companyDetails, companyId } = req.body;

    if (!['company_driver', 'unregistered_driver'].includes(role)) {
        return next();
    }

    const errors = [];

    // Validate driver information
    if (!driverInfo || !driverInfo.name || !driverInfo.phoneNumber) {
        errors.push('Complete driver information is required.');
    }

    // Validate based on driver type
    if (role === 'company_driver') {
        if (!companyId) {
            errors.push('Company ID is required for company drivers.');
        } else {
            // Verify company exists
            const company = await Company.findById(companyId);
            if (!company) {
                errors.push('Invalid company ID. Company not found.');
            }
        }
    } else if (role === 'unregistered_driver') {
        if (!companyDetails || !companyDetails.companyName || !companyDetails.contactPerson) {
            errors.push('Complete company details are required for unregistered drivers.');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    next();
});