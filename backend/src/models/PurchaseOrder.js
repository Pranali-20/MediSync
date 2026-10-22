const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
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
  quantityOrdered: {
    type: Number,
    required: true,
    min: 1,
  },
  quantityReceived: {
    type: Number,
    default: 0,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  expectedBatchNumber: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED'],
    default: 'PENDING',
  },
});

const receivedItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
  },
  medicineName: String,
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
  },
  batchNumber: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  purchasePrice: {
    type: Number,
    required: true,
  },
  sellingPrice: {
    type: Number,
    required: true,
  },
  manufacturingDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
});

const receivingRecordSchema = new mongoose.Schema({
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  receivedByName: {
    type: String,
    default: 'Pharmacist',
  },
  invoiceReference: {
    type: String,
    default: '',
  },
  items: [receivedItemSchema],
  notes: {
    type: String,
    default: '',
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      default: 'ORDERED',
      index: true,
    },
    items: [purchaseOrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    receivedHistory: [receivingRecordSchema],
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByName: {
      type: String,
      default: 'Pharmacist',
    },
  },
  {
    timestamps: true,
  }
);

purchaseOrderSchema.index({ pharmacy: 1, orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ pharmacy: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
