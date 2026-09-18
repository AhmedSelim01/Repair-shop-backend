// middleware/requireCompleteProfile.js
const Company = require('../models/Company');
const asyncHandler = require('express-async-handler');

exports.requireCompleteProfile = asyncHandler(async (req, res, next) => {
    try {
        const companyId = req.user?.companyId || req.params.id;

        if(!companyId) {
            return res.status(400).json({ success: false, message: 'Company ID is required' });
        }

        const company = await Company.findById(companyId);

        if(!company) {
            return res.status(400).json({ success: false, message: 'Company not found.' });
        }

        if(company.profileStatus !== 'complete' && req.path.indexOf('/complete-profile') === -1) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your company profile first',
                requiredFields: ['bankDetails', 'licenseDetails', 'ownerDetails'],
                completionEndpoint: `/api/v1/companies/${companyId}/complete-profile`
            });
        }
        req.company = company;
        next();
    } catch (error) {
        next(error);
    }
});