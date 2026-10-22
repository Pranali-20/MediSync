const mongoose = require('mongoose');

const supplierPriceHistorySchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  batchNumber: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  invoiceNumber: {
    type: String,
    default: '',
  },
});

const supplierSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    gstNumber: {
      type: String,
      default: '',
    },
    paymentTerms: {
      type: String,
      default: 'Net 30 Days',
    },
    leadTimeDays: {
      type: Number,
      default: 3,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    completedOrders: {
      type: Number,
      default: 0,
    },
    totalPurchasedAmount: {
      type: Number,
      default: 0,
    },
    priceHistory: [supplierPriceHistorySchema],
    rating: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ pharmacy: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
