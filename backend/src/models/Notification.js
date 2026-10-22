const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'OUT_OF_STOCK',
        'LOW_STOCK',
        'NEAR_EXPIRY',
        'EXPIRED',
        'PENDING_PO',
        'PENDING_PRESCRIPTION',
        'SLOW_MOVING',
        'SYSTEM',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'danger', 'success'],
      default: 'info',
    },
    entityId: {
      type: String,
      default: '',
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ pharmacy: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
