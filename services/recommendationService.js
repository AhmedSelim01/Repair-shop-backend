const User = require('../models/User');
const StoreItem = require('../models/StoreItem');
const Cart = require('../models/Cart');
const JobCard = require('../models/JobCard');
const mongoose = require('mongoose');

class RecommendationEngine {
    
    // Get personalized product recommendations
    static async getRecommendations(userId, currentProductId = null, limit = 10) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Get user's purchase history and preferences
            const userCarts = await Cart.find({ userId, status: 'checked-out' })
                .populate('items.productId');
            
            const userJobCards = await JobCard.find({ companyId: userId })
                .populate('truckId');

            // Get all recommendation sources
            const collaborativeRecommendations = await this.getCollaborativeRecommendations(userId, limit);
            const contentBasedRecommendations = await this.getContentBasedRecommendations(user, userJobCards, limit);
            const purchaseHistoryRecommendations = await this.getPurchaseHistoryRecommendations(userCarts, limit);
            const truckModelRecommendations = await this.getTruckModelRecommendations(userJobCards, limit);
            
            // Combine and rank recommendations using hybrid approach
            const hybridRecommendations = this.combineRecommendations([
                { recommendations: collaborativeRecommendations, weight: 0.45 }, // Increased from 0.4
                { recommendations: contentBasedRecommendations, weight: 0.35 },  // Decreased from 0.4
                { recommendations: purchaseHistoryRecommendations, weight: 0.15 },
                { recommendations: truckModelRecommendations, weight: 0.05 }     // Decreased from 0.1
            ], limit);

            // Filter out current product if provided
            const filteredRecommendations = hybridRecommendations.filter(item => 
                currentProductId ? item._id.toString() !== currentProductId : true
            );

            return filteredRecommendations.slice(0, limit);
            
        } catch (error) {
            console.error('Recommendation engine error:', error);
            // Fallback to popular items
            return await StoreItem.find({ 
                status: 'active',
                isAvailable: true 
            })
            .sort({ salesCount: -1, rating: -1 })
            .limit(limit);
        }
    }

    // Collaborative filtering: Find users with similar purchasing patterns
    static async getCollaborativeRecommendations(userId, limit) {
        try {
            const userCartItems = await Cart.aggregate([
                { $match: { userId: mongoose.Types.ObjectId(userId), status: 'checked-out' } },
                { $unwind: '$items' },
                { $group: { _id: '$items.productId', count: { $sum: 1 } } }
            ]);

            const userProductIds = userCartItems.map(item => item._id);

            if (userProductIds.length === 0) {
                return await StoreItem.find({ 
                    status: 'active',
                    isAvailable: true 
                })
                .sort({ salesCount: -1 })
                .limit(limit);
            }

            // Find similar users who bought similar products
            const similarUsers = await Cart.aggregate([
                { $match: { 
                    status: 'checked-out', 
                    userId: { $ne: mongoose.Types.ObjectId(userId) } 
                }},
                { $unwind: '$items' },
                { $match: { 'items.productId': { $in: userProductIds } } },
                { $group: { 
                    _id: '$userId', 
                    commonProducts: { $sum: 1 },
                    products: { $push: '$items.productId' }
                }},
                { $match: { commonProducts: { $gte: 2 } } },
                { $sort: { commonProducts: -1 } },
                { $limit: 50 }
            ]);

            // Get products bought by similar users but not by current user
            const recommendedProductIds = [];
            similarUsers.forEach(user => {
                user.products.forEach(productId => {
                    if (!userProductIds.includes(productId.toString()) && 
                        !recommendedProductIds.includes(productId.toString())) {
                        recommendedProductIds.push(productId.toString());
                    }
                });
            });

            return await StoreItem.find({ 
                _id: { $in: recommendedProductIds },
                status: 'active',
                isAvailable: true
            }).limit(limit);
            
        } catch (error) {
            console.error('Collaborative filtering error:', error);
            return [];
        }
    }

    // Recommend items similar to what user previously purchased
    static async getPurchaseHistoryRecommendations(userCarts, limit) {
        try {
            // Extract all purchased product IDs
            const purchasedProductIds = [];
            userCarts.forEach(cart => {
                cart.items.forEach(item => {
                    // Added null check for productId
                    if (item.productId && item.productId._id) {
                        purchasedProductIds.push(item.productId._id.toString());
                    }
                });
            });

            if (purchasedProductIds.length === 0) return [];

            // Find similar items based on purchase history
            return await StoreItem.aggregate([
                { 
                    $match: { 
                        _id: { $nin: purchasedProductIds.map(id => mongoose.Types.ObjectId(id)) },
                        status: 'active',
                        isAvailable: true
                    } 
                },
                {
                    $lookup: {
                        from: "storeitems",
                        localField: "category",
                        foreignField: "category",
                        as: "similarItems"
                    }
                },
                { $unwind: "$similarItems" },
                { 
                    $match: { 
                        "similarItems._id": { $in: purchasedProductIds.map(id => mongoose.Types.ObjectId(id)) }
                    } 
                },
                { $group: { _id: "$_id", doc: { $first: "$$ROOT" }, matchCount: { $sum: 1 } } },
                { $sort: { matchCount: -1 } },
                { $limit: limit },
                { $replaceRoot: { newRoot: "$doc" } }
            ]);
            
        } catch (error) {
            console.error('Purchase history recommendations error:', error);
            return [];
        }
    }

    // Recommend items based on truck models in user's job cards
    static async getTruckModelRecommendations(userJobCards, limit) {
        try {
            // Extract unique truck models from job cards
            const truckModels = [...new Set(
                userJobCards
                    .map(job => job.truckId?.model)
                    .filter(model => model && typeof model === 'string')
            )];

            if (truckModels.length === 0) return [];

            // Create regex pattern for truck models
            const regexPattern = truckModels.map(model => 
                model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special characters
            ).join('|');

            // Find items specifically for these truck models
            return await StoreItem.find({
                $or: [
                    { description: { $regex: regexPattern, $options: 'i' } },
                    { name: { $regex: regexPattern, $options: 'i' } }
                ],
                status: 'active',
                isAvailable: true
            })
            .sort({ salesCount: -1 })
            .limit(limit);
            
        } catch (error) {
            console.error('Truck model recommendations error:', error);
            return [];
        }
    }

    // Content-based filtering: Recommend based on user's truck types and job patterns
    static async getContentBasedRecommendations(user, userJobCards, limit) {
        try {
            const commonRepairTypes = this.extractCommonRepairTypes(userJobCards);

            // Map repair types to product categories
            const categoryMapping = {
                'engine': ['Engine Parts', 'Filters', 'Fluids'],
                'brake': ['Brake System'],
                'transmission': ['Transmission', 'Fluids'],
                'electrical': ['Electrical'],
                'body': ['Body Parts'],
                'maintenance': ['Filters', 'Fluids', 'Tools']
            };

            let recommendedCategories = [];
            commonRepairTypes.forEach(repairType => {
                const categories = categoryMapping[repairType.toLowerCase()] || [];
                recommendedCategories.push(...categories);
            });

            // Remove duplicates
            recommendedCategories = [...new Set(recommendedCategories)];

            if (recommendedCategories.length === 0) {
                return await StoreItem.find({ 
                    status: 'active',
                    isAvailable: true 
                })
                .sort({ salesCount: -1 })
                .limit(limit);
            }

            // Get products from recommended categories
            return await StoreItem.find({
                category: { $in: recommendedCategories },
                status: 'active',
                isAvailable: true
            })
            .sort({ salesCount: -1, rating: -1 })
            .limit(limit);
            
        } catch (error) {
            console.error('Content-based recommendations error:', error);
            return [];
        }
    }

    // Extract common repair types from job card descriptions
    static extractCommonRepairTypes(jobCards) {
        const repairKeywords = {
            'engine': ['engine', 'motor', 'piston', 'cylinder', 'crankshaft'],
            'brake': ['brake', 'braking', 'pad', 'rotor', 'caliper'],
            'transmission': ['transmission', 'gearbox', 'clutch', 'gear'],
            'electrical': ['electrical', 'wiring', 'battery', 'alternator', 'starter'],
            'body': ['body', 'panel', 'door', 'window', 'bumper'],
            'maintenance': ['oil', 'filter', 'maintenance', 'service', 'tune']
        };

        const repairCounts = {};
        
        jobCards.forEach(job => {
            if (job.description && Array.isArray(job.description)) {
                job.description.forEach(desc => {
                    const text = (desc.partName || '').toLowerCase();
                    Object.keys(repairKeywords).forEach(type => {
                        if (repairKeywords[type].some(keyword => text.includes(keyword))) {
                            repairCounts[type] = (repairCounts[type] || 0) + 1;
                        }
                    });
                });
            }
        });

        // Return top 3 most common repair types
        return Object.entries(repairCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([type]) => type);
    }

    // Combine multiple recommendation sources with weights
    static combineRecommendations(sources, limit) {
        const scoreMap = new Map();

        sources.forEach(({ recommendations, weight }) => {
            recommendations.forEach((item, index) => {
                const itemId = item._id.toString();
                const score = (recommendations.length - index) * weight;
                
                if (scoreMap.has(itemId)) {
                    scoreMap.set(itemId, {
                        item,
                        score: scoreMap.get(itemId).score + score
                    });
                } else {
                    scoreMap.set(itemId, { item, score });
                }
            });
        });

        // Sort by combined score and return items
        return Array.from(scoreMap.values())
            .sort((a, b) => b.score - a.score)
            .map(({ item }) => item)
            .slice(0, limit);
    }
}

// Export methods
module.exports = {
    getRecommendations: RecommendationEngine.getRecommendations.bind(RecommendationEngine),
    getCollaborativeRecommendations: RecommendationEngine.getCollaborativeRecommendations.bind(RecommendationEngine),
    getContentBasedRecommendations: RecommendationEngine.getContentBasedRecommendations.bind(RecommendationEngine)
};