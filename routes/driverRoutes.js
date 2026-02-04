// routes/driverRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { createDriver, getAllDrivers, getDriverById, updateDriver, deleteDriver, getCompanyDrivers } = require('../controllers/driverController');

router.post('/', authMiddleware, roleMiddleware(['admin', 'company']), createDriver);
router.get('/', authMiddleware, roleMiddleware(['admin', 'company', 'employee']), getAllDrivers);
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'company', 'employee']), getDriverById);
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'company']), updateDriver);
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'company']), deleteDriver);
router.get('/company/:companyId', authMiddleware, roleMiddleware(['admin', 'company', 'employee']), getCompanyDrivers);

module.exports = router;