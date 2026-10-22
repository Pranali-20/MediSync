const Notification = require('../models/Notification');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const PurchaseOrder = require('../models/PurchaseOrder');
const Prescription = require('../models/Prescription');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get all notifications (dynamic computed + saved)
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const pharmacyId = req.pharmacyId;
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const liveNotifications = [];

    // 1. Out of stock medicines
    const outOfStock = await Medicine.find({
      pharmacy: pharmacyId,
      totalStock: 0,
    }).select('name category');

    if (outOfStock.length > 0) {
      liveNotifications.push({
        _id: 'live-out-of-stock',
        type: 'OUT_OF_STOCK',
        title: `${outOfStock.length} Medicine${outOfStock.length > 1 ? 's' : ''} Out of Stock`,
        message: `${outOfStock.slice(0, 3).map((m) => m.name).join(', ')}${outOfStock.length > 3 ? ` +${outOfStock.length - 3} more` : ''} currently have 0 stock.`,
        severity: 'danger',
        link: '/inventory?status=Out of Stock',
        createdAt: new Date(),
        read: false,
      });
    }

    // 2. Low stock below minStockAlert
    const lowStock = await Medicine.find({
      pharmacy: pharmacyId,
      totalStock: { $gt: 0 },
      $expr: { $lte: ['$totalStock', '$minStockAlert'] },
    }).select('name totalStock minStockAlert');

    if (lowStock.length > 0) {
      liveNotifications.push({
        _id: 'live-low-stock',
        type: 'LOW_STOCK',
        title: `${lowStock.length} Low Stock Alert${lowStock.length > 1 ? 's' : ''}`,
        message: `${lowStock.slice(0, 3).map((m) => `${m.name} (${m.totalStock} left)`).join(', ')} reached reorder thresholds.`,
        severity: 'warning',
        link: '/inventory?status=Low',
        createdAt: new Date(),
        read: false,
      });
    }

    // 3. Batches expiring within 30 days
    const expiringBatches = await Batch.find({
      pharmacy: pharmacyId,
      quantity: { $gt: 0 },
      expiryDate: { $lte: in30Days },
    }).populate('medicine', 'name');

    if (expiringBatches.length > 0) {
      const expiredCount = expiringBatches.filter((b) => new Date(b.expiryDate) < now).length;
      const nearExpiryCount = expiringBatches.length - expiredCount;

      if (expiredCount > 0) {
        liveNotifications.push({
          _id: 'live-expired-batches',
          type: 'EXPIRED',
          title: `${expiredCount} Expired Batch${expiredCount > 1 ? 'es' : ''}`,
          message: `Action needed: Discard or write off expired inventory lots.`,
          severity: 'danger',
          link: '/expiry',
          createdAt: new Date(),
          read: false,
        });
      }

      if (nearExpiryCount > 0) {
        liveNotifications.push({
          _id: 'live-near-expiry-batches',
          type: 'NEAR_EXPIRY',
          title: `${nearExpiryCount} Batch${nearExpiryCount > 1 ? 'es' : ''} Expiring Soon`,
          message: `Batches expiring within 30 days. Prioritize FEFO dispensing/counter sales.`,
          severity: 'warning',
          link: '/expiry',
          createdAt: new Date(),
          read: false,
        });
      }
    }

    // 4. Pending Purchase Orders
    const pendingPOs = await PurchaseOrder.countDocuments({
      pharmacy: pharmacyId,
      status: { $in: ['ORDERED', 'PARTIALLY_RECEIVED'] },
    });

    if (pendingPOs > 0) {
      liveNotifications.push({
        _id: 'live-pending-pos',
        type: 'PENDING_PO',
        title: `${pendingPOs} Pending Purchase Order${pendingPOs > 1 ? 's' : ''}`,
        message: `Orders placed with suppliers awaiting delivery and shipment receiving.`,
        severity: 'info',
        link: '/purchases',
        createdAt: new Date(),
        read: false,
      });
    }

    // 5. Pending Hospital Prescriptions (if hospital or hybrid)
    if (['hospital', 'hybrid'].includes(req.pharmacyType)) {
      const pendingRxs = await Prescription.countDocuments({
        pharmacy: pharmacyId,
        status: { $in: ['PENDING', 'PARTIALLY_DISPENSED'] },
      });

      if (pendingRxs > 0) {
        liveNotifications.push({
          _id: 'live-pending-rxs',
          type: 'PENDING_PRESCRIPTION',
          title: `${pendingRxs} Prescription${pendingRxs > 1 ? 's' : ''} in Queue`,
          message: `Inpatient/Outpatient prescriptions waiting for FEFO dispensing verification.`,
          severity: 'info',
          link: '/dispensing',
          createdAt: new Date(),
          read: false,
        });
      }
    }

    // Get any manually recorded stored notifications
    const stored = await Notification.find({ pharmacy: pharmacyId })
      .sort({ createdAt: -1 })
      .limit(20);

    const allNotifications = [...liveNotifications, ...stored];

    return successResponse(res, {
      notifications: allNotifications,
      unreadCount: liveNotifications.length + stored.filter((n) => !n.read).length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id && !id.startsWith('live-')) {
      await Notification.findOneAndUpdate(
        { _id: id, pharmacy: req.pharmacyId },
        { read: true }
      );
    }
    return successResponse(res, { success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all notifications
// @route   POST /api/notifications/clear-all
// @access  Private
const clearAll = async (req, res, next) => {
  try {
    await Notification.updateMany({ pharmacy: req.pharmacyId }, { read: true });
    return successResponse(res, { success: true }, 'All notifications cleared.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  clearAll,
};
