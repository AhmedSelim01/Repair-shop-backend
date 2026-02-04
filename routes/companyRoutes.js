// routes/companyRoutes.js
const express = require('express');
const router = express.Router();

const {
    createCompany,
    completeProfile,
    addAssociations,
    updateCompany,
    getAllCompanies,
    getCompanyById,
    deleteCompany
} = require('../controllers/companyController');

const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');

// Create a new company (admin or employee)
router.post('/', authMiddleware, roleMiddleware(['admin', 'employee']), createCompany);

// Complete or update company profile
router.put('/:id/complete-profile', validateObjectId, authMiddleware, roleMiddleware(['admin', 'employee', 'company']), completeProfile);

// Add drivers or trucks to company
router.put('/:id/add-associations', validateObjectId, authMiddleware, roleMiddleware(['admin', 'employee', 'company']), addAssociations);

// Update company (restricted to admin)
router.put('/:id', validateObjectId, authMiddleware, roleMiddleware(['admin']), updateCompany);

// Get list of all companies
router.get('/', authMiddleware, roleMiddleware(['admin', 'employee']), getAllCompanies);

// Get a single company by ID
router.get('/:id', validateObjectId, authMiddleware, roleMiddleware(['admin', 'employee']), getCompanyById);

// Delete company
router.delete('/:id', validateObjectId, authMiddleware, roleMiddleware(['admin']), deleteCompany);

module.exports = router;