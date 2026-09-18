
const asyncHandler = require('express-async-handler');
const StoreItem = require('../models/StoreItem');
const logger = require('../config/logger');

// Create new store item (admin only)
exports.createStoreItem = asyncHandler(async (req, res) => {
    const {
        name,
        description,
        price,
        category,
        stock,
        imageUrl,
        specifications,
        tags
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || stock === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Name, description, price, category, and stock are required.'
        });
    }

    const storeItem = await StoreItem.create({
        name,
        description,
        price,
        category,
        stock,
        imageUrl,
        specifications,
        tags,
        createdBy: req.user.id
    });

    logger.info('Store item created', { itemId: storeItem._id, name });

    res.status(201).json({
        success: true,
        message: 'Store item created successfully.',
        storeItem
    });
});

// Get all store items with advanced filtering
exports.getAllStoreItems = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const category = req.query.category;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    const total = await StoreItem.countDocuments(filter);
    const storeItems = await StoreItem.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit);

    // Get categories for filtering
    const categories = await StoreItem.distinct('category');

    res.status(200).json({
        success: true,
        metadata: {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            categories
        },
        data: storeItems
    });
});

// Get store item by ID
exports.getStoreItemById = asyncHandler(async (req, res) => {
    const storeItem = await StoreItem.findById(req.params.id);

    if (!storeItem) {
        return res.status(404).json({
            success: false,
            message: 'Store item not found.'
        });
    }

    // Increment view count for analytics
    storeItem.views = (storeItem.views || 0) + 1;
    await storeItem.save();

    res.status(200).json({
        success: true,
        storeItem
    });
});

// Update store item
exports.updateStoreItem = asyncHandler(async (req, res) => {
    const storeItem = await StoreItem.findById(req.params.id);

    if (!storeItem) {
        return res.status(404).json({
            success: false,
            message: 'Store item not found.'
        });
    }

    const updatedItem = await StoreItem.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    logger.info('Store item updated', { itemId: req.params.id });

    res.status(200).json({
        success: true,
        message: 'Store item updated successfully.',
        storeItem: updatedItem
    });
});

// Delete store item
exports.deleteStoreItem = asyncHandler(async (req, res) => {
    const storeItem = await StoreItem.findById(req.params.id);

    if (!storeItem) {
        return res.status(404).json({
            success: false,
            message: 'Store item not found.'
        });
    }

    await storeItem.deleteOne();

    logger.info('Store item deleted', { itemId: req.params.id });

    res.status(200).json({
        success: true,
        message: 'Store item deleted successfully.'
    });
});

// Get trending items (AI-powered feature)
exports.getTrendingItems = asyncHandler(async (req, res) => {
    const trendingItems = await StoreItem.find()
        .sort({ views: -1, createdAt: -1 })
        .limit(10);

    res.status(200).json({
        success: true,
        data: trendingItems
    });
});

// Get low stock alerts
exports.getLowStockAlerts = asyncHandler(async (req, res) => {
    const threshold = req.query.threshold || 10;
    
    const lowStockItems = await StoreItem.find({
        stock: { $lte: threshold }
    }).sort({ stock: 1 });

    res.status(200).json({
        success: true,
        alerts: lowStockItems,
        count: lowStockItems.length
    });
});
