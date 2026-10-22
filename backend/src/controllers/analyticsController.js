const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const InventoryTransaction = require('../models/InventoryTransaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const { successResponse } = require('../utils/responseFormatter');

// @desc    Get complete real dashboard summary adapting dynamically to pharmacy type
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    const pharmacyId = req.pharmacyId;
    const pharmacyType = req.pharmacyType || 'retail';

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Total Medicines & Batches
    const totalMedicines = await Medicine.countDocuments({ pharmacy: pharmacyId });
    const allMedicines = await Medicine.find({ pharmacy: pharmacyId });
    const totalBatches = await Batch.countDocuments({ pharmacy: pharmacyId, quantity: { $gt: 0 } });

    // 2. Stock Health Metrics
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockMedicines = [];

    allMedicines.forEach((m) => {
      const minAlert = m.minStockAlert || 20;
      if (m.totalStock === 0) {
        outOfStockCount++;
        lowStockMedicines.push({
          _id: m._id,
          name: m.name,
          genericName: m.genericName,
          totalStock: 0,
          minStockAlert: minAlert,
          unit: m.unit || 'units',
          reorderQuantity: m.reorderQuantity || 50,
          isOut: true,
        });
      } else if (m.totalStock <= minAlert) {
        lowStockCount++;
        lowStockMedicines.push({
          _id: m._id,
          name: m.name,
          genericName: m.genericName,
          totalStock: m.totalStock,
          minStockAlert: minAlert,
          unit: m.unit || 'units',
          reorderQuantity: m.reorderQuantity || 50,
          isOut: false,
        });
      }
    });

    // Sort lowest stock first and take top 4
    lowStockMedicines.sort((a, b) => a.totalStock - b.totalStock);

    // 3. Expiry Metrics
    const now = new Date();
    const in60Days = new Date();
    in60Days.setDate(now.getDate() + 60);

    const expiringBatchesWithMeds = await Batch.find({
      pharmacy: pharmacyId,
      quantity: { $gt: 0 },
      expiryDate: { $lte: in60Days },
    })
      .populate('medicine', 'name genericName')
      .sort({ expiryDate: 1 })
      .limit(6);

    let expiredCount = 0;
    let nearExpiryCount = 0;

    const expiringBatchesList = expiringBatchesWithMeds.map((b) => {
      const exp = new Date(b.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let severity = 'warning'; // <= 60 days
      if (diffDays < 0) {
        expiredCount++;
        severity = 'expired';
      } else if (diffDays <= 30) {
        nearExpiryCount++;
        severity = 'critical';
      }

      return {
        _id: b._id,
        batchNumber: b.batchNumber,
        medicineId: b.medicine?._id || b.medicine,
        medicineName: b.medicine?.name || b.medicineName || 'Medicine',
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        daysRemaining: diffDays,
        severity,
      };
    });

    // 4. Today's Retail Sales Metrics
    const todaySales = await Sale.find({
      pharmacy: pharmacyId,
      createdAt: { $gte: startOfToday },
    });

    const todaySalesRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const todayInvoiceCount = todaySales.length;
    const todayUnitsSold = todaySales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + (it.quantity || 0), 0),
      0
    );
    const todayReturnsCount = todaySales.reduce((sum, s) => sum + (s.returns ? s.returns.length : 0), 0);

    // 5. Today's Hospital Dispensing Metrics
    let todayDispensedPrescriptionsCount = 0;
    let todayDispensedItemsUnits = 0;
    let pendingPrescriptionsCount = 0;
    let totalPatientsCount = 0;

    if (['hospital', 'hybrid'].includes(pharmacyType)) {
      totalPatientsCount = await Patient.countDocuments({ pharmacy: pharmacyId });
      pendingPrescriptionsCount = await Prescription.countDocuments({
        pharmacy: pharmacyId,
        status: { $in: ['PENDING', 'PARTIALLY_DISPENSED'] },
      });

      const todayDispensedRxs = await Prescription.find({
        pharmacy: pharmacyId,
        dispensedAt: { $gte: startOfToday },
      });

      todayDispensedPrescriptionsCount = todayDispensedRxs.length;
      todayDispensedItemsUnits = todayDispensedRxs.reduce(
        (sum, rx) =>
          sum +
          rx.dispensingHistory
            .filter((h) => new Date(h.dispensedAt) >= startOfToday)
            .reduce((hSum, h) => hSum + h.items.reduce((iSum, it) => iSum + (it.quantity || 0), 0), 0),
        0
      );
    }

    // 6. Today's Adjustments
    const todayAdjustmentsCount = await InventoryTransaction.countDocuments({
      pharmacy: pharmacyId,
      createdAt: { $gte: startOfToday },
      type: { $in: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DISPOSAL'] },
    });

    // 7. Recent Transactions Ledger Preview
    const recentTransactions = await InventoryTransaction.find({ pharmacy: pharmacyId })
      .sort({ createdAt: -1 })
      .limit(6);

    // 8. Pending POs
    const pendingPOsCount = await PurchaseOrder.countDocuments({
      pharmacy: pharmacyId,
      status: { $in: ['ORDERED', 'PARTIALLY_RECEIVED'] },
    });

    const pendingOrdersList = await PurchaseOrder.find({
      pharmacy: pharmacyId,
      status: { $in: ['ORDERED', 'PARTIALLY_RECEIVED'] },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('orderNumber supplierName totalAmount status expectedDeliveryDate items');

    const totalStockUnits = allMedicines.reduce((sum, m) => sum + (m.totalStock || 0), 0);

    return successResponse(res, {
      pharmacyType,
      inventory: {
        totalMedicines,
        totalStockUnits,
        totalBatches,
        lowStockCount,
        outOfStockCount,
        nearExpiryCount,
        expiredCount,
        lowStockMedicines,
        expiringBatchesList,
      },
      todaySummary: {
        retail: {
          salesRevenue: Number(todaySalesRevenue.toFixed(2)),
          invoiceCount: todayInvoiceCount,
          unitsSold: todayUnitsSold,
          returnsCount: todayReturnsCount,
        },
        hospital: {
          dispensedPrescriptionsCount: todayDispensedPrescriptionsCount,
          dispensedItemsUnits: todayDispensedItemsUnits,
          pendingPrescriptionsCount,
          totalPatients: totalPatientsCount,
        },
        adjustmentsCount: todayAdjustmentsCount,
        pendingPOsCount,
        pendingOrdersList,
      },
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed real sales & movement analytics
// @route   GET /api/analytics/sales
// @access  Private
const getSalesAnalytics = async (req, res, next) => {
  try {
    const pharmacyId = req.pharmacyId;

    const sales = await Sale.find({ pharmacy: pharmacyId }).sort({ createdAt: 1 });
    const transactions = await InventoryTransaction.find({ pharmacy: pharmacyId }).sort({ createdAt: 1 });

    if (sales.length === 0 && transactions.length === 0) {
      return successResponse(res, {
        hasData: false,
        message: 'Not enough transaction data to display analytics charts.',
        salesTrend: [],
        topSelling: [],
        paymentMethodBreakdown: {},
      });
    }

    const salesByDay = {};
    sales.forEach((s) => {
      const dateStr = new Date(s.createdAt).toISOString().split('T')[0];
      salesByDay[dateStr] = (salesByDay[dateStr] || 0) + (s.totalAmount || 0);
    });

    const salesTrend = Object.keys(salesByDay).map((date) => ({
      date,
      revenue: Number(salesByDay[date].toFixed(2)),
    }));

    const itemSalesMap = {};
    sales.forEach((s) => {
      s.items.forEach((it) => {
        const name = it.medicineName || 'Unknown';
        if (!itemSalesMap[name]) {
          itemSalesMap[name] = { name, quantity: 0, revenue: 0 };
        }
        itemSalesMap[name].quantity += it.quantity || 0;
        itemSalesMap[name].revenue += it.subtotal || 0;
      });
    });

    const topSelling = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const paymentMethods = {};
    sales.forEach((s) => {
      const pm = s.paymentMethod || 'UPI';
      paymentMethods[pm] = (paymentMethods[pm] || 0) + (s.totalAmount || 0);
    });

    return successResponse(res, {
      hasData: true,
      salesTrend,
      topSelling,
      paymentMethodBreakdown: paymentMethods,
      totalSalesCount: sales.length,
      totalRevenue: Number(sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0).toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
};

const getTopMedicines = async (req, res, next) => {
  return getSalesAnalytics(req, res, next);
};

const getInventoryAnalytics = async (req, res, next) => {
  return getDashboardSummary(req, res, next);
};

const getAnalyticsSummary = async (req, res, next) => {
  return getDashboardSummary(req, res, next);
};

module.exports = {
  getDashboardSummary,
  getSalesAnalytics,
  getTopMedicines,
  getInventoryAnalytics,
  getAnalyticsSummary,
};
