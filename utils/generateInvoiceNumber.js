// utils/generateInvoiceNumber.js
const TaxInvoice = require("../models/TaxInvoice");

async function generateInvoiceNumber() {
  const count = await TaxInvoice.countDocuments();
  return `INV-${count + 1}`;
}

module.exports = generateInvoiceNumber;