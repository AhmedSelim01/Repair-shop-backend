// models/InvoiceCounter.js
const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  lastNumber: { type: Number, default: 0 }
});

module.exports = mongoose.model('InvoiceCounter', invoiceCounterSchema);