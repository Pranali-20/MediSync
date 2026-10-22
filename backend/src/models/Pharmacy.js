const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pharmacy name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['hospital', 'retail', 'hybrid'],
      default: 'retail',
      required: [true, 'Pharmacy type is required (hospital, retail, or hybrid)'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    gstNumber: {
      type: String,
      default: '',
    },
    licenseNumber: {
      type: String,
      default: '',
    },
    tagline: {
      type: String,
      default: 'Smarter Inventory. Safer Operations. Better Pharmacy Management.',
    },
    currency: {
      type: String,
      default: '₹',
    },
    defaultTaxRate: {
      type: Number,
      default: 12,
    },
    lowStockThresholdDefault: {
      type: Number,
      default: 20,
    },
    nearExpiryDaysThreshold: {
      type: Number,
      default: 90,
    },
    fefoEnabled: {
      type: Boolean,
      default: true,
    },
    soundAlerts: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Pharmacy', pharmacySchema);
