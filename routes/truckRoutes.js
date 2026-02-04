// routes/truckRoutes.js
const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

const {
  createTruck,
  getAllTrucks,
  getTruckById,
  updateTruck,
  deleteTruck,
  updateTruckRepairStatus,
  getActiveJobCardForTruck
} = require('../controllers/truckController');

router.post('/', authMiddleware, roleMiddleware(['admin', 'company']), createTruck);
router.get('/', authMiddleware, roleMiddleware(['admin', 'company', 'employee']), getAllTrucks);
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'company', 'employee']), getTruckById);
router.get('/:id/active-jobcard', authMiddleware, roleMiddleware(['admin', 'company', 'employee']), getActiveJobCardForTruck);
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'company']), updateTruck);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteTruck);
router.patch('/:id/repair-status', authMiddleware, roleMiddleware(['admin', 'employee']), updateTruckRepairStatus);

module.exports = router;