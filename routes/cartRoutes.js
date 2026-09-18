const express = require('express');
const {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    checkoutCart
} = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *           description: Product ID
 *         quantity:
 *           type: number
 *           minimum: 1
 *           description: Quantity to add
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's active cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's cart contents
 */
router.get('/', authMiddleware, getCart);

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItem'
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Validation error or insufficient stock
 */
router.post('/add', authMiddleware, addToCart);

/**
 * @swagger
 * /api/cart/update:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItem'
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *       404:
 *         description: Item not found in cart
 */
router.put('/update', authMiddleware, updateCartItem);

/**
 * @swagger
 * /api/cart/remove/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       404:
 *         description: Cart or item not found
 */
router.delete('/remove/:productId', authMiddleware, removeFromCart);

/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       404:
 *         description: Cart not found
 */
router.delete('/clear', authMiddleware, clearCart);

/**
 * @swagger
 * /api/cart/checkout:
 *   post:
 *     summary: Checkout cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *               shippingAddress:
 *                 type: object
 *     responses:
 *       200:
 *         description: Checkout completed successfully
 *       400:
 *         description: Cart is empty or validation error
 */
router.post('/checkout', authMiddleware, checkoutCart);

module.exports = router;
