// controllers/invoiceController.js
const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const InvoiceCounter = require('../models/InvoiceCounter');
const CreditNote = require('../models/CreditNote');
const CreditNoteCounter = require('../models/CreditNoteCounter');

// ---------------------- CREATE DRAFT INVOICE ----------------------
exports.createDraftInvoice = asyncHandler(async (req, res) => {
  const {
    customerId,
    customerType,
    jobCardId,
    quotationId,
    deliveryNoteId,
    items,
    vatPercent
  } = req.body;

  if (!customerId || !customerType) {
    return res.status(400).json({ success: false, message: 'Customer data required' });
  }

  let subtotal = 0;
  items?.forEach(i => subtotal += (i.total || (i.qty * i.unitPrice)));

  const vatAmount = (subtotal * (vatPercent || 0)) / 100;
  const totalAmount = subtotal + vatAmount;

  const invoice = await Invoice.create({
    customerId,
    customerType,
    jobCardId,
    quotationId,
    deliveryNoteId,
    items,
    subtotal,
    vatPercent,
    vatAmount,
    totalAmount
  });

  res.status(201).json({
    success: true,
    message: 'Draft invoice created',
    invoice
  });
});

// ---------------------- UPDATE DRAFT ONLY ----------------------
exports.updateDraftInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findById(id);

  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  if (invoice.isLocked || invoice.status !== 'draft') {
    return res.status(400).json({ success: false, message: 'Cannot edit issued invoice' });
  }

  const updates = req.body;

  // Recalculate totals if items changed
  if (updates.items) {
    let subtotal = 0;
    updates.items.forEach(i => subtotal += (i.total || (i.qty * i.unitPrice)));

    updates.subtotal = subtotal;
    updates.vatAmount = (subtotal * (updates.vatPercent || invoice.vatPercent || 0)) / 100;
    updates.totalAmount = subtotal + updates.vatAmount;
  }

  const updated = await Invoice.findByIdAndUpdate(id, updates, { new: true });

  res.json({
    success: true,
    message: 'Draft invoice updated',
    invoice: updated
  });
});

// ---------------------- ISSUE INVOICE ----------------------
exports.issueInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findById(id);

  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  if (invoice.status !== 'draft')
    return res.status(400).json({ success: false, message: 'Invoice already issued or cancelled' });

  // Year based on today
  const year = new Date().getFullYear();
  const shortYear = String(year).slice(-2);

  let counter = await InvoiceCounter.findOne({ year });

  if (!counter) {
    counter = await InvoiceCounter.create({ year, lastNumber: 0 });
  }

  counter.lastNumber += 1;
  await counter.save();

  const sequence = counter.lastNumber.toString().padStart(5, '0');
  const finalNumber = `INV-${shortYear}: ${sequence}`;

  invoice.status = 'issued';
  invoice.isLocked = true;
  invoice.issuedAt = new Date();
  invoice.invoiceNumber = finalNumber;
  invoice.year = year;
  invoice.sequenceNumber = counter.lastNumber;

  await invoice.save();

  res.json({
    success: true,
    message: 'Invoice issued successfully',
    invoice
  });
});

// ---------------------- LIST ISSUED ----------------------
exports.getIssuedInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ status: 'issued' }).sort({ createdAt: -1 });
  res.json({ success: true, invoices });
});

//  ---------------------- LIST INVOICES WITH FILTERS ----------------------
exports.getInvoices = asyncHandler(async (req, res) => {
  const { status, paymentStatus, customerId } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (customerId) filter.customerId = customerId;

  const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

  res.json({ success: true, count: invoices.length, invoices });
});

// ----------------------- GENERATE STATEMENT OF ACCOUNT (SOA) -----------------------
exports.generateSOA = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid Customer ID' });
    }

    // Fetch all unpaid / partial issued invoices for this customer
    const invoices = await Invoice.find({
      customerId,
      status: 'issued',
      paymentStatus: { $in: ['unpaid', 'partial'] }
    }).sort({ issuedAt: 1 });

    if (!invoices.length) {
      return res.status(200).json({
        success: true,
        message: 'No outstanding invoices for this customer',
        soa: {
          customerId,
          totalOutstanding: 0,
          invoices: []
        }
      });
    }

    let totalOutstanding = 0;

    const soaInvoices = invoices.map(inv => {
      const balance = inv.totalAmount - inv.paidAmount;
      totalOutstanding += balance;

      return {
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.issuedAt,
        dueDate: inv.dueDate || null,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balance,
        currency: inv.currency,
        paymentStatus: inv.paymentStatus
      };
    });

    return res.status(200).json({
      success: true,
      soa: {
        customerId,
        generatedAt: new Date(),
        totalOutstanding,
        currency: soaInvoices[0].currency,
        invoices: soaInvoices
      }
    });

  } catch (error) {
    console.error('SOA Generation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Statement of Account'
    });
  }
};