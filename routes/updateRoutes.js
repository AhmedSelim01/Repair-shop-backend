// routes/upgradeRoutes.js
const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { upgradeToTruckOwner, upgradeToCompany } = require('../controllers/upgradeController');

const router = express.Router();

router.post('/truck-owner', authMiddleware, upgradeToTruckOwner);
router.post('/company', authMiddleware, upgradeToCompany);

module.exports = router;