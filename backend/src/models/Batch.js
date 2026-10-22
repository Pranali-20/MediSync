const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    initialQuantity: {
      type: Number,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    damagedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: 'Units',
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase cost price is required'],
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling MRP is required'],
      default: 0,
    },
    manufacturingDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    supplierName: {
      type: String,
      default: 'Authorized Distributor',
    },
    barcode: {
      type: String,
      default: '',
    },
    minimumStockLevel: {
      type: Number,
      default: 10,
    },
    reorderPoint: {
      type: Number,
      default: 20,
    },
    reorderQuantity: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: ['Normal', 'Monitor', 'Near Expiry', 'Expired'],
      default: 'Normal',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for dynamic Days Remaining calculation
batchSchema.virtual('daysRemaining').get(function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const exp = new Date(this.expiryDate);
  const diffTime = exp.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for Usable Stock
batchSchema.virtual('usableStock').get(function () {
  const isExpired = this.expiryDate && new Date(this.expiryDate) < new Date();
  if (isExpired) return 0;
  const usable = (this.quantity || 0) - (this.reservedQuantity || 0) - (this.damagedQuantity || 0);
  return Math.max(0, usable);
});

batchSchema.set('toJSON', { virtuals: true });
batchSchema.set('toObject', { virtuals: true });

// Compound indexes for FEFO ordering
batchSchema.index({ pharmacy: 1, medicine: 1, expiryDate: 1 });
batchSchema.index({ pharmacy: 1, expiryDate: 1 });
batchSchema.index({ pharmacy: 1, medicine: 1, batchNumber: 1 });

module.exports = mongoose.model('Batch', batchSchema);
