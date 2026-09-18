
const express = require('express');
const {
    createStoreItem,
    getAllStoreItems,
    getStoreItemById,
    updateStoreItem,
    deleteStoreItem,
    getTrendingItems,
    getLowStockAlerts
} = require('../controllers/storeItemController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateStoreItem } = require('../middleware/requestValidation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     StoreItem:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - category
 *         - stock
 *       properties:
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         price:
 *           type: number
 *           description: Product price
 *         category:
 *           type: string
 *           enum: [Engine Parts, Brake System, Transmission, Electrical, Body Parts, Filters, Fluids, Tools, Accessories, Other]
 *         stock:
 *           type: number
 *           description: Available quantity
 */

/**
 * @swagger
 * /api/store:
 *   get:
 *     summary: Get all store items with filtering
 *     tags: [Store]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of store items
 */
router.get('/', getAllStoreItems);

/**
 * @swagger
 * /api/store/trending:
 *   get:
 *     summary: Get trending store items
 *     tags: [Store]
 *     responses:
 *       200:
 *         description: List of trending items
 */
router.get('/trending', getTrendingItems);

/**
 * @swagger
 * /api/store/low-stock:
 *   get:
 *     summary: Get low stock alerts (Admin only)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of low stock items
 */
router.get('/low-stock', authMiddleware, roleMiddleware(['admin']), getLowStockAlerts);

/**
 * @swagger
 * /api/store/{id}:
 *   get:
 *     summary: Get store item by ID
 *     tags: [Store]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store item details
 *       404:
 *         description: Store item not found
 */
router.get('/:id', getStoreItemById);

/**
 * @swagger
 * /api/store:
 *   post:
 *     summary: Create new store item (Admin only)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreItem'
 *     responses:
 *       201:
 *         description: Store item created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, roleMiddleware(['admin']), validateStoreItem, createStoreItem);

/**
 * @swagger
 * /api/store/{id}:
 *   put:
 *     summary: Update store item (Admin only)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreItem'
 *     responses:
 *       200:
 *         description: Store item updated successfully
 *       404:
 *         description: Store item not found
 */
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateStoreItem);

/**
 * @swagger
 * /api/store/{id}:
 *   delete:
 *     summary: Delete store item (Admin only)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store item deleted successfully
 *       404:
 *         description: Store item not found
 */
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteStoreItem);

module.exports = router;
