const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    genericName: {
      type: String,
      required: [true, 'Generic salt name is required'],
      trim: true,
    },
    brand: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      default: 'General',
    },
    manufacturer: {
      type: String,
      default: 'General Pharmaceuticals',
    },
    dosageForm: {
      type: String,
      default: 'Tablet', // Tablet, Capsule, Syrup, Injection, Cream, Drops, etc.
    },
    strength: {
      type: String,
      default: '500mg',
    },
    unit: {
      type: String,
      default: 'Strip', // Strip, Bottle, Box, Piece
    },
    minStockAlert: {
      type: Number,
      default: 20,
    },
    reorderQuantity: {
      type: Number,
      default: 50,
    },
    totalStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    location: {
      type: String,
      default: 'Rack A - Shelf 1',
    },
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    barcode: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick medicine lookup within pharmacy
medicineSchema.index({ pharmacy: 1, name: 1 });
medicineSchema.index({ pharmacy: 1, genericName: 1 });
medicineSchema.index({ pharmacy: 1, barcode: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
