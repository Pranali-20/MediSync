const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'System',
    },
    userRole: {
      type: String,
      default: 'pharmacist',
    },
    action: {
      type: String,
      required: true,
      index: true,
      // e.g. STOCK_ADJUSTMENT, PURCHASE_ORDER_CREATED, PURCHASE_ORDER_RECEIVED,
      // SALE_CREATED, SALE_RETURN, PRESCRIPTION_DISPENSED, MEDICINE_CREATED,
      // BATCH_CREATED, SETTINGS_UPDATE, USER_CREATED, USER_ROLE_CHANGED
    },
    entity: {
      type: String,
      required: true,
      index: true,
      // Medicine, Batch, Sale, PurchaseOrder, Prescription, User, Pharmacy, Inventory
    },
    entityId: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ pharmacy: 1, createdAt: -1 });
auditLogSchema.index({ pharmacy: 1, entity: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
