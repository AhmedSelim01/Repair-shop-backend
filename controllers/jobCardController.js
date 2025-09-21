
const asyncHandler = require('express-async-handler');
const JobCard = require('../models/JobCard');
const Company = require('../models/Company');
const Truck = require('../models/Truck');
const logger = require('../config/logger');

// Create new JobCard with comprehensive validation
exports.createJobCard = asyncHandler(async (req, res) => {
    const { truckId, description, status, driverName, driverPhone, companyId } = req.body;

    // Validate required fields
    if (!truckId || !description) {
        logger.warn('JobCard creation failed: Missing required fields', { truckId, description });
        return res.status(400).json({ 
            success: false, 
            message: 'TruckId and description are required.' 
        });
    }

    // Check if the truck exists
    const truck = await Truck.findById(truckId);
    if (!truck) {
        logger.warn('JobCard creation failed: Truck not found', { truckId });
        return res.status(404).json({ 
            success: false, 
            message: 'Truck does not exist.' 
        });
    }

    // Validate company if provided
    if (companyId) {
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ 
                success: false, 
                message: 'Company does not exist.' 
            });
        }
    }

    // Create new jobcard
    const jobCard = await JobCard.create({
        truckId,
        description,
        status: status || 'in-progress',
        driverName,
        driverPhone,
        companyId,
    });

    logger.info('JobCard created successfully', { jobCardId: jobCard._id, truckId });
    
    return res.status(201).json({ 
        success: true, 
        message: 'Job card created successfully.', 
        jobCard 
    });
});

// Get all job cards with advanced filtering and sorting
exports.getAllJobCards = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Validate query params
    if (page <= 0 || limit <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Page and limit must be positive numbers.' 
        });
    }

    // Build filter object
    const filter = {};
    if (status) {
        filter.status = status;
    }

    const totalJobCards = await JobCard.countDocuments(filter);
    const jobcards = await JobCard.find(filter)
        .populate('truckId', 'licensePlate model year')
        .populate('companyId', 'companyName')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit);

    res.status(200).json({
        success: true,
        metadata: {
            total: totalJobCards,
            currentPage: page,
            totalPages: Math.ceil(totalJobCards / limit),
            hasNext: page < Math.ceil(totalJobCards / limit),
            hasPrev: page > 1
        },
        data: jobcards,
    });
});

// Get job card by id with detailed information
exports.getJobCardById = asyncHandler(async (req, res) => {
    const jobCard = await JobCard.findById(req.params.id)
        .populate('truckId', 'licensePlate model year')
        .populate('companyId', 'companyName');

    if (!jobCard) {
        logger.warn('JobCard not found', { jobCardId: req.params.id });
        return res.status(404).json({ 
            success: false, 
            message: 'Job card not found.' 
        });
    }

    res.status(200).json({ 
        success: true, 
        message: 'Job card found.', 
        jobCard 
    });
});

// Update job card with validation
exports.updateJobCard = asyncHandler(async (req, res) => {
    const { description, status, driverName, driverPhone, companyId } = req.body;

    const jobCard = await JobCard.findById(req.params.id);
    if (!jobCard) {
        return res.status(404).json({ 
            success: false, 
            message: 'Job card not found.' 
        });
    }

    // Update fields if provided
    if (description) jobCard.description = description;
    if (status) {
        jobCard.status = status;
        if (status === 'completed') {
            jobCard.completedDate = new Date();
        }
    }
    if (driverName) jobCard.driverName = driverName;
    if (driverPhone) jobCard.driverPhone = driverPhone;
    if (companyId) jobCard.companyId = companyId;

    const updatedJobCard = await jobCard.save();

    logger.info('JobCard updated successfully', { jobCardId: req.params.id });
    
    res.status(200).json({ 
        success: true, 
        message: 'Job card updated successfully.', 
        jobCard: updatedJobCard 
    });
});

// Delete job card with audit trail
exports.deleteJobCard = asyncHandler(async (req, res) => {
    const jobCard = await JobCard.findById(req.params.id);
    if (!jobCard) {
        return res.status(404).json({ 
            success: false, 
            message: 'Job card not found.' 
        });
    }

    await jobCard.deleteOne();
    
    logger.info('JobCard deleted successfully', { 
        jobCardId: req.params.id, 
        deletedBy: req.user.id 
    });
    
    res.status(200).json({
        success: true, 
        message: 'Job card deleted successfully.'
    });
});

// Get JobCard analytics (2025 feature)
exports.getJobCardAnalytics = asyncHandler(async (req, res) => {
    const analytics = await JobCard.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgCompletionTime: {
                    $avg: {
                        $cond: [
                            { $eq: ['$status', 'completed'] },
                            { $subtract: ['$completedDate', '$createdAt'] },
                            null
                        ]
                    }
                }
            }
        }
    ]);

    const totalJobs = await JobCard.countDocuments();
    const completedJobs = await JobCard.countDocuments({ status: 'completed' });
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(2) : 0;

    res.status(200).json({
        success: true,
        analytics: {
            statusBreakdown: analytics,
            totalJobs,
            completedJobs,
            completionRate: `${completionRate}%`
        }
    });
});
