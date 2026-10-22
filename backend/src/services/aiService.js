const axios = require('axios');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiService = {
  // Compute average daily sales for a medicine over past 30 days
  getAverageDailySales: async (pharmacyId, medicineId, daysWindow = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysWindow);

    const sales = await Sale.aggregate([
      {
        $match: {
          pharmacy: pharmacyId,
          createdAt: { $gte: startDate },
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.medicine': medicineId,
        },
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: '$items.quantity' },
        },
      },
    ]);

    const totalUnitsSold = sales[0]?.totalUnits || 0;
    const avgDailySales = totalUnitsSold / daysWindow;

    return {
      totalUnitsSold,
      daysWindow,
      avgDailySales: Number(avgDailySales.toFixed(2)),
    };
  },

  // Calculate stock-out prediction
  calculateStockoutRisk: async (pharmacyId, medicineId) => {
    const medicine = await Medicine.findOne({ _id: medicineId, pharmacy: pharmacyId });
    if (!medicine) return null;

    const { avgDailySales } = await aiService.getAverageDailySales(pharmacyId, medicine._id);

    if (avgDailySales === 0) {
      return {
        medicineId: medicine._id,
        medicineName: medicine.name,
        currentStock: medicine.totalStock,
        averageDailySales: 0,
        estimatedDaysUntilStockout: null,
        status: 'INSUFFICIENT_DATA',
        message: 'Insufficient sales history to forecast stock-out risk.',
      };
    }

    const estimatedDays = Math.floor(medicine.totalStock / avgDailySales);

    return {
      medicineId: medicine._id,
      medicineName: medicine.name,
      currentStock: medicine.totalStock,
      averageDailySales: avgDailySales,
      estimatedDaysUntilStockout: estimatedDays,
      status: estimatedDays <= 3 ? 'CRITICAL_RISK' : estimatedDays <= 7 ? 'MODERATE_RISK' : 'HEALTHY',
      message:
        estimatedDays <= 3
          ? `${medicine.name} may reach stock-out in approximately ${estimatedDays} day${estimatedDays === 1 ? '' : 's'}.`
          : `${medicine.name} has approximately ${estimatedDays} days of stock buffer remaining.`,
    };
  },

  // Generate Purchase Recommendation for a medicine
  generatePurchaseRecommendation: async (pharmacyId, medicineId) => {
    const medicine = await Medicine.findOne({ _id: medicineId, pharmacy: pharmacyId });
    if (!medicine) return null;

    const { avgDailySales } = await aiService.getAverageDailySales(pharmacyId, medicine._id);
    const targetBufferDays = 30; // 30-day stock buffer standard
    const safetyStock = medicine.minStockAlert || 20;

    const expectedMonthlyDemand = Math.ceil(avgDailySales * targetBufferDays);
    const needed = expectedMonthlyDemand + safetyStock - medicine.totalStock;
    const recommendedQty = Math.max(0, needed);

    return {
      medicineId: medicine._id,
      medicineName: medicine.name,
      currentStock: medicine.totalStock,
      minStockAlert: medicine.minStockAlert,
      averageDailySales: avgDailySales,
      recommendedOrderQuantity: recommendedQty,
      confidenceScore: avgDailySales > 0 ? 0.88 : 0.45,
      reason:
        avgDailySales > 0
          ? `Based on average consumption of ${avgDailySales} units/day and safety buffer target.`
          : 'Based on baseline safety threshold since sales velocity data is limited.',
    };
  },

  // Comprehensive AI Insights overview
  getAllInsights: async (pharmacyId) => {
    // Try external Python ML service first if online
    try {
      const externalResponse = await axios.get(`${AI_SERVICE_URL}/api/insights`, {
        params: { pharmacyId: pharmacyId.toString() },
        timeout: 2000,
      });
      if (externalResponse.data) {
        return {
          available: true,
          source: 'PYTHON_ML_SERVICE',
          insights: externalResponse.data,
        };
      }
    } catch {
      // Graceful fallback to Node.js predictive heuristics
    }

    const medicines = await Medicine.find({ pharmacy: pharmacyId });
    if (medicines.length === 0) {
      return {
        available: true,
        source: 'BUILTIN_HEURISTICS',
        insights: [],
        message: 'No medicines in pharmacy catalog. Add medicines to enable predictive alerts.',
      };
    }

    const insights = [];

    // 1. Stockout risks
    for (const med of medicines) {
      if (med.totalStock <= med.minStockAlert) {
        const risk = await aiService.calculateStockoutRisk(pharmacyId, med._id);
        if (risk && risk.estimatedDaysUntilStockout !== null && risk.estimatedDaysUntilStockout <= 5) {
          insights.push({
            id: `ai-stockout-${med._id}`,
            type: 'stockout_risk',
            severity: 'critical',
            title: `${med.name} may run out in ~${risk.estimatedDaysUntilStockout} days`,
            description: `Current stock is ${med.totalStock} units. Average daily velocity is ${risk.averageDailySales} units.`,
            medicineId: med._id,
            recommendedAction: `Place reorder to replenish stock above safety level (${med.minStockAlert} units)`,
            actionType: 'restock',
            estimatedImpact: 'Prevents customer stock-out and lost counter turnover',
          });
        }
      }
    }

    // 2. Near expiry lots
    const nearExpiryBatches = await Batch.find({
      pharmacy: pharmacyId,
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }).populate('medicine', 'name');

    if (nearExpiryBatches.length > 0) {
      insights.push({
        id: 'ai-expiry-alert-1',
        type: 'expiry_alert',
        severity: 'warning',
        title: `${nearExpiryBatches.length} batch(es) approaching expiration within 30 days`,
        description: `Batches including ${nearExpiryBatches.map((b) => b.batchNumber).slice(0, 2).join(', ')} should be prioritized using FEFO dispatch.`,
        recommendedAction: 'Enforce FEFO at billing counter & consider fast-clearance discount',
        actionType: 'discount',
        estimatedImpact: 'Minimizes write-off inventory capital losses',
      });
    }

    return {
      available: true,
      source: 'BUILTIN_HEURISTICS',
      insights,
    };
  },
};

module.exports = aiService;
