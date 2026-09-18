const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

const {
  createJobCard,
  getAllJobCards,
  getJobCardById,
  updateJobCard,
  deleteJobCard,
  updateJobCardStatus,
} = require('../controllers/jobCardController');

// CREATE
router.post('/',authMiddleware,roleMiddleware(['admin', 'employee']),createJobCard);
// GET ALL
router.get('/',authMiddleware,roleMiddleware(['admin', 'employee']),getAllJobCards);
// GET ONE
router.get('/:id',authMiddleware,roleMiddleware(['admin', 'employee']),getJobCardById);
// UPDATE DETAILS
router.put('/:id',authMiddleware,roleMiddleware(['admin', 'employee']),updateJobCard);
// DELETE
router.delete('/:id',authMiddleware,roleMiddleware(['admin']),deleteJobCard);
// STATUS UPDATE
router.patch('/:id/status',authMiddleware,roleMiddleware(['admin', 'employee']),updateJobCardStatus);

module.exports = router;