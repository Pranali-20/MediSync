const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const Prescription = require('../models/Prescription');
const InventoryTransaction = require('../models/InventoryTransaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get real data-driven AI operational recommendations
// @route   GET /api/ai/insights
// @access  Private
const getInsights = async (req, res, next) => {
  try {
    const pharmacyId = req.pharmacyId;
    const pharmacyType = req.pharmacyType || 'retail';

    // 1. Check total historical transaction count to enforce ZERO FAKE DATA rule
    const transactionCount = await InventoryTransaction.countDocuments({ pharmacy: pharmacyId });
    const medicines = await Medicine.find({ pharmacy: pharmacyId });
    const batches = await Batch.find({ pharmacy: pharmacyId }).populate('supplier');
    const pendingPOs = await PurchaseOrder.find({
      pharmacy: pharmacyId,
      status: { $in: ['ORDERED', 'PARTIALLY_RECEIVED'] },
    });

    if (medicines.length === 0 || transactionCount < 2) {
      return successResponse(res, {
        hasSufficientData: false,
        message: 'Not enough historical transaction data to generate reliable AI recommendations. Record sales, dispensing, or purchases to unlock operational forecasts.',
        recommendations: [],
        slowMoving: [],
        expiryRisks: [],
        metrics: {
          analyzedMedicinesCount: medicines.length,
          activeBatchesCount: batches.length,
          historicalTransactions: transactionCount,
        },
      });
    }

    // 2. Fetch past 30 days movements to compute daily velocity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastTransactions = await InventoryTransaction.find({
      pharmacy: pharmacyId,
      createdAt: { $gte: thirtyDaysAgo },
      type: { $in: ['SALE', 'PRESCRIPTION_DISPENSING'] },
    });

    const usagePerMed = {};
    pastTransactions.forEach((t) => {
      const medId = t.medicine.toString();
      usagePerMed[medId] = (usagePerMed[medId] || 0) + (t.quantity || 0);
    });

    const recommendations = [];
    const slowMoving = [];
    const expiryRisks = [];
    const now = new Date();

    for (const med of medicines) {
      const medId = med._id.toString();
      const medBatches = batches.filter((b) => b.medicine.toString() === medId);

      const totalStock = med.totalStock || 0;
      const expiredStock = medBatches
        .filter((b) => b.expiryDate && new Date(b.expiryDate) < now)
        .reduce((sum, b) => sum + (b.quantity || 0), 0);
      const damagedStock = medBatches.reduce((sum, b) => sum + (b.damagedQuantity || 0), 0);
      const reservedStock = medBatches.reduce((sum, b) => sum + (b.reservedQuantity || 0), 0);

      const usableStock = Math.max(0, totalStock - expiredStock - damagedStock - reservedStock);
      const totalUsed30Days = usagePerMed[medId] || 0;
      const dailyUsage = totalUsed30Days > 0 ? Number((totalUsed30Days / 30).toFixed(1)) : 0;

      const onOrderQty = pendingPOs.reduce((sum, po) => {
        const item = po.items.find((i) => i.medicine.toString() === medId);
        if (item) {
          return sum + Math.max(0, item.quantityOrdered - (item.quantityReceived || 0));
        }
        return sum;
      }, 0);

      const coverageDays = dailyUsage > 0 ? Math.round(usableStock / dailyUsage) : (usableStock > 0 ? 999 : 0);
      const reorderPoint = med.minStockAlert || 20;
      const preferredReorderQty = med.reorderQuantity || 50;

      let supplierLeadTime = 3;
      let supplierName = 'Preferred Supplier';
      if (medBatches.length > 0 && medBatches[0].supplier) {
        supplierLeadTime = medBatches[0].supplier.leadTimeDays || 3;
        supplierName = medBatches[0].supplier.name;
      }

      const isBelowReorder = usableStock <= reorderPoint;
      const willRunOutSoon = dailyUsage > 0 && coverageDays <= supplierLeadTime + 2;

      if (isBelowReorder || willRunOutSoon) {
        let priority = 'Medium';
        if (usableStock === 0) priority = 'Critical';
        else if (coverageDays <= supplierLeadTime) priority = 'High';

        recommendations.push({
          medicineId: med._id,
          medicineName: med.name,
          genericName: med.genericName,
          category: med.category,
          dosageForm: med.dosageForm,
          usableStock,
          totalStock,
          dailyUsage,
          coverageDays: coverageDays === 999 ? 'N/A' : `${coverageDays} days`,
          reorderPoint,
          recommendedReorderQty: preferredReorderQty,
          supplierName,
          supplierLeadTimeDays: supplierLeadTime,
          onOrderQuantity: onOrderQty,
          priority,
          reasoning:
            usableStock === 0
              ? `Stock is depleted (0 units). ${onOrderQty > 0 ? `${onOrderQty} units currently on order in pending PO.` : 'Consider placing a purchase order immediately.'}`
              : `Usable stock (${usableStock}) is below reorder threshold (${reorderPoint}). At average daily usage of ${dailyUsage} units/day, stock will be exhausted in ~${coverageDays} days. Supplier lead time is ${supplierLeadTime} days.`,
        });
      }

      // Slow-Moving Check
      if (usableStock >= 30 && totalUsed30Days === 0) {
        slowMoving.push({
          medicineId: med._id,
          medicineName: med.name,
          category: med.category,
          usableStock,
          unitValue: med.sellingPrice,
          totalCapitalTied: Number((usableStock * med.purchasePrice).toFixed(2)),
          daysWithoutMovement: 30,
          suggestion: 'High stock with zero movement in the last 30 days. Review ordering velocity and check batch expiry dates to prevent lock-in.',
        });
      }

      // Expiry Risk Check
      for (const batch of medBatches) {
        if (batch.quantity > 0 && batch.expiryDate) {
          const exp = new Date(batch.expiryDate);
          const daysToExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysToExpiry > 0 && daysToExpiry <= 90) {
            const expectedUsage = dailyUsage > 0 ? Math.round(dailyUsage * daysToExpiry) : 0;
            if (batch.quantity > expectedUsage) {
              const excessRisk = batch.quantity - expectedUsage;
              expiryRisks.push({
                medicineId: med._id,
                medicineName: med.name,
                batchNumber: batch.batchNumber,
                quantity: batch.quantity,
                expiryDate: batch.expiryDate,
                daysRemaining: daysToExpiry,
                expectedUsageBeforeExpiry: expectedUsage,
                excessUnitsAtRisk: excessRisk,
                estimatedValueAtRisk: Number((excessRisk * batch.purchasePrice).toFixed(2)),
                suggestion: `Batch ${batch.batchNumber} has ${batch.quantity} units expiring in ${daysToExpiry} days. Expected usage is only ${expectedUsage} units. Prioritize FEFO dispensing or consult distributor for return credit.`,
              });
            }
          }
        }
      }
    }

    recommendations.sort((a, b) => {
      const order = { Critical: 1, High: 2, Medium: 3 };
      return (order[a.priority] || 4) - (order[b.priority] || 4);
    });

    return successResponse(res, {
      hasSufficientData: true,
      recommendations,
      slowMoving,
      expiryRisks,
      metrics: {
        analyzedMedicinesCount: medicines.length,
        activeBatchesCount: batches.filter((b) => b.quantity > 0).length,
        historicalTransactionsCount: transactionCount,
        reorderAlertsCount: recommendations.length,
        slowMovingCount: slowMoving.length,
        expiryRiskCount: expiryRisks.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDemandForecast = async (req, res, next) => {
  return getInsights(req, res, next);
};

const getStockoutPrediction = async (req, res, next) => {
  return getInsights(req, res, next);
};

const getPurchaseRecommendation = async (req, res, next) => {
  return getInsights(req, res, next);
};

module.exports = {
  getInsights,
  getDemandForecast,
  getStockoutPrediction,
  getPurchaseRecommendation,
};
