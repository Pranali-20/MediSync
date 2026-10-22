const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  genericName: {
    type: String,
    default: '',
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
  },
  expiryDate: {
    type: Date,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  quantityReturned: {
    type: Number,
    default: 0,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  taxPercent: {
    type: Number,
    default: 12,
  },
  subtotal: {
    type: Number,
    required: true,
  },
});

const returnRecordItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: String,
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
  },
  batchNumber: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  refundAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  condition: {
    type: String,
    enum: ['SELLABLE', 'DAMAGED', 'EXPIRED', 'NON_RESELLABLE'],
    default: 'SELLABLE',
  },
  reason: {
    type: String,
    default: 'Customer return',
  },
});

const returnRecordSchema = new mongoose.Schema({
  returnDate: {
    type: Date,
    default: Date.now,
  },
  items: [returnRecordItemSchema],
  refundTotal: {
    type: Number,
    required: true,
    default: 0,
  },
  reason: {
    type: String,
    default: '',
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  processedByName: {
    type: String,
    default: 'Pharmacist',
  },
});

const saleSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    doctorName: {
      type: String,
      default: '',
      trim: true,
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Insurance'],
      default: 'UPI',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    returns: [returnRecordSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pharmacistName: {
      type: String,
      default: 'Pharmacist',
    },
  },
  {
    timestamps: true,
  }
);

saleSchema.index({ pharmacy: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
