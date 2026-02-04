// controllers/paymentController.js
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const JobCard = require('../models/JobCard');

// Build items from amount (fallback for tests)
const buildItemsFromAmount = (amount) => [
  {
    description: 'Service Payment',
    quantity: 1,
    unitPrice: amount,
    totalPrice: amount
  }
];

// ----------------------- PROCESS JOB CARD PAYMENT -----------------------
exports.processJobCardPayment = async (req, res) => {
  try {
    const { jobCardId, items, amount, paymentMethod, discount = 0, currency = 'AED' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobCardId)) {
      return res.status(400).json({ success: false, message: 'Invalid JobCard ID' });
    }

    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) {
      return res.status(404).json({ success: false, message: 'JobCard not found' });
    }

    let finalItems = items;
    if ((!items || !Array.isArray(items) || items.length === 0) && amount > 0) {
      finalItems = buildItemsFromAmount(amount);
    }

    if (!finalItems || finalItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Payment items or amount required' });
    }

    const payment = await Payment.create({
      jobCardId,
      referenceType: 'jobcard',
      referenceId: jobCard._id,
      customerId: req.user._id,
      items: finalItems,
      discount,
      currency,
      paymentMethod,
      paymentStatus: 'completed',
      processedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Job card payment processed successfully',
      data: payment.generateReceipt()
    });
  } catch (error) {
    console.error('JobCard Payment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process job card payment'
    });
  }
};

// ----------------------- PROCESS ORDER PAYMENT -----------------------
exports.processOrderPayment = async (req, res) => {
  try {
    const { orderId, items, amount, paymentMethod, discount = 0, currency = 'AED' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid Order ID' });
    }

    let finalItems = items;
    if ((!items || !Array.isArray(items) || items.length === 0) && amount > 0) {
      finalItems = buildItemsFromAmount(amount);
    }

    if (!finalItems || finalItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Payment items or amount required' });
    }

    const payment = await Payment.create({
      orderId,
      referenceType: 'order',
      referenceId: orderId,
      customerId: req.user._id,
      items: finalItems,
      discount,
      currency,
      paymentMethod,
      paymentStatus: 'completed',
      processedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Order payment processed successfully',
      data: payment.generateReceipt()
    });
  } catch (error) {
    console.error('Order Payment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process order payment'
    });
  }
};
// ----------------------- PROCESS INVOICE PAYMENT -----------------------
exports.processInvoicePayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, currency = 'AED', notes = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ success: false, message: 'Invalid Invoice ID' });
    }

    const invoice = await require('../models/Invoice').findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status !== 'issued') {
      return res.status(400).json({ success: false, message: 'Invoice is not issued yet' });
    }

    const remainingAmount = invoice.totalAmount - invoice.paidAmount;
    if (amount <= 0 || amount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount must be between 1 and ${remainingAmount}`
      });
    }

    // Create payment record (NO items reused from invoice)
    const payment = await Payment.create({
      customerId: invoice.customerId,
      referenceType: 'invoice',
      referenceId: invoice._id,
      items: [
        {
          description: `Invoice Payment (${invoice.invoiceNumber})`,
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount
        }
      ],
      currency,
      paymentMethod,
      paymentStatus: 'completed',
      notes,
      processedAt: new Date()
    });

    // Update invoice totals
    invoice.paidAmount += amount;
    invoice.payments.push(payment._id);

    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
      invoice.paidAt = new Date();
    } else {
      invoice.paymentStatus = 'partial';
    }

    await invoice.save();

    return res.status(201).json({
      success: true,
      message: 'Invoice payment recorded successfully',
      payment: payment.generateReceipt(),
      invoiceStatus: invoice.paymentStatus,
      remainingAmount: invoice.totalAmount - invoice.paidAmount
    });

  } catch (error) {
    console.error('Invoice Payment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process invoice payment'
    });
  }
};

// ----------------------- PROCESS INVOICE PAYMENT -----------------------
exports.processInvoicePayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, currency = 'AED', notes = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ success: false, message: 'Invalid Invoice ID' });
    }

    const invoice = await require('../models/Invoice').findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status !== 'issued') {
      return res.status(400).json({ success: false, message: 'Invoice is not issued yet' });
    }

    const remainingAmount = invoice.totalAmount - invoice.paidAmount;
    if (amount <= 0 || amount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount must be between 1 and ${remainingAmount}`
      });
    }

    // Create payment record (NO items reused from invoice)
    const payment = await Payment.create({
      customerId: invoice.customerId,
      referenceType: 'invoice',
      referenceId: invoice._id,
      items: [
        {
          description: `Invoice Payment (${invoice.invoiceNumber})`,
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount
        }
      ],
      currency,
      paymentMethod,
      paymentStatus: 'completed',
      notes,
      processedAt: new Date()
    });

    // Update invoice totals
    invoice.paidAmount += amount;
    invoice.payments.push(payment._id);

    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
      invoice.paidAt = new Date();
    } else {
      invoice.paymentStatus = 'partial';
    }

    await invoice.save();

    return res.status(201).json({
      success: true,
      message: 'Invoice payment recorded successfully',
      payment: payment.generateReceipt(),
      invoiceStatus: invoice.paymentStatus,
      remainingAmount: invoice.totalAmount - invoice.paidAmount
    });

  } catch (error) {
    console.error('Invoice Payment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process invoice payment'
    });
  }
};

// ----------------------- GET PAYMENT HISTORY -----------------------
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = {};

    if (!['admin', 'employee'].includes(req.user.role)) {
      query.customerId = req.user._id;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page: Number(page),
      data: payments
    });
  } catch (error) {
    console.error('Payment History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
};

// ----------------------- GET SINGLE PAYMENT -----------------------
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (
      payment.customerId.toString() !== req.user._id.toString() &&
      !['admin', 'employee'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    console.error('Get Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment'
    });
  }
};

// ----------------------- REFUND PAYMENT -----------------------
exports.refundPayment = async (req, res) => {
  try {
    const { refundAmount, refundReason = '' } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    payment.paymentStatus = 'refunded';
    payment.refundAmount = refundAmount || payment.grandTotal;
    payment.refundReason = refundReason;
    payment.refundedAt = new Date();

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Refund Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refund payment'
    });
  }
};

// ----------------------- PAYMENT ANALYTICS -----------------------
exports.getPaymentAnalytics = async (req, res) => {
  try {
    const byStatus = await Payment.aggregate([
      { $group: { _id: '$paymentStatus', totalAmount: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);

    const revenue = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus,
        totalRevenue: revenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment analytics' });
  }
};

// ----------------------- PAYMENT WEBHOOK -----------------------
exports.webhookPaymentHandler = async (req, res) => {
  try {
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ success: false });
  }
};