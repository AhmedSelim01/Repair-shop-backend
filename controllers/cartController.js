const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const StoreItem = require('../models/StoreItem');
const logger = require('../config/logger');
const { getRecommendations } = require('../services/recommendationService');

// Add item to cart with smart quantity management
exports.addToCart = asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid productId and quantity are required.'
        });
    }

    // Check if product exists and is available
    const product = await StoreItem.findById(productId);
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found.'
        });
    }

    if (product.stock < quantity) {
        return res.status(400).json({
            success: false,
            message: `Insufficient stock. Available: ${product.stock}`
        });
    }

    // Find or create active cart
    let cart = await Cart.findOne({ userId, status: 'active' });
    if (!cart) {
        cart = new Cart({ userId, items: [], status: 'active' });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
    );

    const totalPrice = product.price * quantity;

    if (existingItemIndex > -1) {
        // Update existing item
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice += totalPrice;
    } else {
        // Add new item
        cart.items.push({
            productId,
            quantity,
            totalPrice
        });
    }

    await cart.save();

    // Get AI-powered recommendations
    const recommendations = await getRecommendations(userId, productId);

    logger.info('Item added to cart', { userId, productId, quantity });

    res.status(200).json({
        success: true,
        message: 'Item added to cart successfully.',
        cart,
        recommendations
    });
});

// Get user's active cart with detailed information
exports.getCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId, status: 'active' })
        .populate('items.productId', 'name description price imageUrl category');

    if (!cart) {
        return res.status(200).json({
            success: true,
            message: 'Cart is empty.',
            cart: { items: [], totalPrice: 0 }
        });
    }

    res.status(200).json({
        success: true,
        cart
    });
});

// Update item quantity in cart
exports.updateCartItem = asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    if (!productId || quantity < 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid productId and quantity are required.'
        });
    }

    const cart = await Cart.findOne({ userId, status: 'active' });
    if (!cart) {
        return res.status(404).json({
            success: false,
            message: 'Active cart not found.'
        });
    }

    const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Item not found in cart.'
        });
    }

    if (quantity === 0) {
        // Remove item from cart
        cart.items.splice(itemIndex, 1);
    } else {
        // Update quantity
        const product = await StoreItem.findById(productId);
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${product.stock}`
            });
        }

        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].totalPrice = product.price * quantity;
    }

    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Cart updated successfully.',
        cart
    });
});

// Remove item from cart
exports.removeFromCart = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId, status: 'active' });
    if (!cart) {
        return res.status(404).json({
            success: false,
            message: 'Active cart not found.'
        });
    }

    cart.items = cart.items.filter(
        item => item.productId.toString() !== productId
    );

    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully.',
        cart
    });
});

// Clear entire cart
exports.clearCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId, status: 'active' });
    if (!cart) {
        return res.status(404).json({
            success: false,
            message: 'Active cart not found.'
        });
    }

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(200).json({
        success: true,
        message: 'Cart cleared successfully.',
        cart
    });
});

// Checkout cart - Create order but don't process payment yet
exports.checkoutCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { paymentMethod, shippingAddress } = req.body;

    // Validate payment method and shipping address
    if (!paymentMethod || !shippingAddress) {
        return res.status(400).json({
            success: false,
            message: 'Payment method and shipping address are required.'
        });
    }

    const cart = await Cart.findOne({ userId, status: 'active' })
        .populate('items.productId');

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Cart is empty or not found.'
        });
    }

    // Validate stock availability
    for (const item of cart.items) {
        if (item.productId.stock < item.quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock for ${item.productId.name}. Available: ${item.productId.stock}`
            });
        }
    }

    // Calculate total amount
    const totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Create order record
    const order = await Order.create({
        userId,
        items: cart.items.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.price,
            totalPrice: item.totalPrice
        })),
        totalAmount,
        paymentMethod,
        shippingAddress,
        status: 'pending_payment'
    });

    // Mark cart as checked out and link to order
    cart.status = 'checked-out';
    cart.orderId = order._id;
    await cart.save();

    logger.info('Cart checked out - order created', { 
        userId, 
        cartId: cart._id, 
        orderId: order._id,
        totalAmount
    });

    res.status(200).json({
        success: true,
        message: 'Order created successfully. Proceed to payment.',
        orderId: order._id,
        totalAmount,
        paymentRequired: true
    });
});
