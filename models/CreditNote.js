const mongoose = require("mongoose");

const creditNoteSchema = new mongoose.Schema(
  {
    originalInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true
    },

    creditNoteNumber: {
      type: String,
      required: true,
      unique: true
    },

    year: Number,
    sequenceNumber: Number,

    reason: {
      type: String,
      default: "Invoice correction"
    },

    // Copy of invoice financials
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    customerType: {
      type: String,
      enum: ["User", "Company"],
      required: true
    },

    items: [
      {
        description: String,
        qty: Number,
        unitPrice: Number,
        total: Number
      }
    ],

    subtotal: Number,
    vatPercent: Number,
    vatAmount: Number,
    totalAmount: Number,

    issuedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CreditNote", creditNoteSchema);