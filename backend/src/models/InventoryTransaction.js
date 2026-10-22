const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    medicineName: {
      type: String,
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },
    batchNumber: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'PRESCRIPTION_DISPENSING', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN', 'DISPOSAL'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      default: 0,
    },
    newStock: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: '',
    },
    reference: {
      type: String,
      default: '', // Invoice #, PO #, Adjustment Memo
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

inventoryTransactionSchema.index({ pharmacy: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
