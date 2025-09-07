// Import required dependencies
const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');
const mongoose = require('mongoose');

/**
 * CREATE COMPANY ENDPOINT
 * Registers a new company in the system with initial profile status
 * Validates uniqueness and provides next steps for profile completion
 */
exports.createCompany = asyncHandler(async(req, res, next) => {
    try {
        // Extract required fields from request body
        const { companyName, contactEmail } = req.body;

        // Note: This ID validation appears to be misplaced - should be removed
        if (!mongoose.Types.ObjectId.isValid(Company._id)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID.' });
        }

        // INPUT VALIDATION: Ensure required fields are provided
        if (!companyName || !contactEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'Company name and contact email are required.' 
            });
        }

        // Check if the company already exists
        const existingCompany = await Company.findOne({ 
            $or: [{ companyName }, { contactEmail }] 
        });

        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'A company with this name or email already exists.',
            });
        }

        // Create a new company with initial status
        const newCompany = await Company.create({
            companyName,
            contactEmail,
            profileStatus: 'initial',
            bankDetails: [],
            licenseDetails: [],
            ownerDetails: [],
            drivers: [],
            associatedTrucks: []
        });

        res.status(201).json({
            success: true,
            message: 'Company registered successfully. Please complete your profile.',
            company: newCompany,
            nextSteps: {
                requiredFields: ['licenseDetails', 'ownerDetails'],
                endpoint: `/api/v1/companies/${newCompany._id}/complete-profile`
            }
        });
    } catch (error) {
        next(error);
    }
});

exports.completeProfile = asyncHandler(async(req, res, next) => {
    try {
        const { id } = req.params; 
        const { bankDetails, licenseDetails, ownerDetails } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID.' });
        }

        const company = await Company.findById(id);
        if(!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }
        // Validate required fields for profile completion
        if (!licenseDetails || !ownerDetails) {
            return res.status(400).json({ success: false, message: 'License details and owner details are required for profile completion.',});
        }

        // Update company profile
        company.licenseDetails = licenseDetails;
        company.ownerDetails = ownerDetails;
        if (bankDetails) company.bankDetails = bankDetails;
        
        // Update profile status
        company.profileStatus = bankDetails ? 'complete' : 'basic';

        const updatedCompany = await company.save();

        res.status(200).json({success: true,
            message: `Company profile ${company.profileStatus === 'complete' ? 'completed' : 'updated'} successfully.`,
            company: updatedCompany,
            nextSteps: company.profileStatus === 'basic' ? {
                optionalFields: ['bankDetails'],
                endpoint: `/api/v1/companies/${id}/complete-profile`
            } : null
        });
    } catch (error) {
        next(error);
    }
});

exports.addAssociations = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { drivers, associatedTrucks } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID.' });
        }

        const company = await Company.findById(id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found.'
            });
        }

        if (!drivers && !associatedTrucks) {
            return res.status(400).json({
                success: false,
                message: 'Driver information or truck details are required.'
            });
        }

        // Add new associations if provided
        if (drivers && Array.isArray(drivers)) {
            company.drivers.push(...drivers);
        }

        if (associatedTrucks && Array.isArray(associatedTrucks)) {
            company.associatedTrucks.push(...associatedTrucks);
        }

        await company.save();

        return res.status(200).json({
            success: true,
            message: 'Associations added successfully.',
            company: company
        });
    } catch (error) {
        next(error);
    }
});

exports.updateCompany = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID.' });
        }
        
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        // If company profile isn't complete, certain updates should go through complete-profile
        if (company.profileStatus !== 'complete' && 
            (updates.licenseDetails || updates.ownerDetails || updates.bankDetails)) {
            return res.status(400).json({ success: false,
                message: 'Please use the complete-profile endpoint to update profile details.',
                endpoint: `/api/v1/companies/${id}/complete-profile`
            });
        }

        // Allow updating only non-profile fields
        ['companyName', 'contactEmail', 'associatedTrucks'].forEach(field => {
            if (updates[field]) company[field] = updates[field];
        });

        const updatedCompany = await company.save();

        res.status(200).json({ success: true, message: 'Company updated successfully.', company: updatedCompany });
    } catch (error) {
        next(error);
    }
});

exports.getAllCompanies = asyncHandler(async(res, next) => {
    try {

        if (!mongoose.Types.ObjectId.isValid(Company._id)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID.' });
        }

        const companies = await Company.find().populate('associatedTrucks drivers');
        res.status(200).json({ success: true, companies });
    } catch (error) {
        next(error);
    }
});

exports.getCompanyById = asyncHandler(async(req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID.' });
        }
        const company = await Company.findById(id).populate('associatedTrucks drivers');
        if(!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' })
        }
        res.status(200).json({ success: true, company })
    } catch (error) {
        next(error);
    }
});

exports.deleteCompany = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID.' });
        }

        // Find the company by ID
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        // Remove the company
        await company.deleteOne();

        res.status(200).json({ success: true, message: 'Company deleted successfully.'});
    } catch (error) {
        next(error);
    }
});