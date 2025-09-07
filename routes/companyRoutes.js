const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');
const { createCompany, completeProfile, addAssociations, updateCompany, getAllCompanies, getCompanyById, deleteCompany } = require('../controllers/companyController');
const router = express.Router();

// Create a new company
router.post('/', authMiddleware, roleMiddleware(['admin', 'employee']), createCompany);
// Complete company profile
router.put('/:id/complete-profile', validateObjectId, authMiddleware, roleMiddleware(['admin', 'employee', 'company']), completeProfile);
// Add associations to company
router.put('/:id/add-associations', validateObjectId, authMiddleware, roleMiddleware(['admin', 'employee', 'company']), addAssociations);
// Update company details
router.put('/:id', validateObjectId, authMiddleware, roleMiddleware(['admin']), updateCompany);
// Get all companies
router.get('/', authMiddleware, roleMiddleware(['admin', 'employee']), getAllCompanies);
// Get company by ID
router.get('/:id', validateObjectId, authMiddleware, roleMiddleware(['admin', 'employee']), getCompanyById);
// Delete company
router.delete('/:id', validateObjectId, authMiddleware, roleMiddleware(['admin']), deleteCompany);

module.exports = router;