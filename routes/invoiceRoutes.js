const express = require('express');
const {
  createDraftInvoice,
  updateDraftInvoice,
  issueInvoice,
  getIssuedInvoices,
  generateSOA
} = require('../controllers/invoiceController');

const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Only Admin + Employee
router.post(
  '/',
  roleMiddleware(['admin', 'employee']),
  createDraftInvoice
);

router.put(
  '/:id',
  roleMiddleware(['admin', 'employee']),
  updateDraftInvoice
);

router.post(
  '/:id/issue',
  roleMiddleware(['admin', 'employee']),
  issueInvoice
);

// Lists
router.get(
  '/issued',
  roleMiddleware(['admin', 'employee']),
  getIssuedInvoices
);

router.get(
  '/soa/:customerId',
  roleMiddleware(['admin','employee']),
  generateSOA
)

router.post(
  "/:id/cancel",
  roleMiddleware(["admin", "employee"]),
  cancelInvoice
);

module.exports = router;