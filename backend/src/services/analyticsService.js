const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');

const analyticsService = {
  // Aggregate real sales by time window
  getSalesTrend: async (pharmacyId, range = '7days') => {
    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '3months') {
      startDate.setMonth(now.getMonth() - 3);
    }

    const sales = await Sale.find({
      pharmacy: pharmacyId,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: 1 });

    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalTransactions = sales.length;

    // Daily buckets
    const dailyMap = {};
    sales.forEach((s) => {
      const dateKey = s.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, revenue: 0, count: 0 };
      }
      dailyMap[dateKey].revenue += s.totalAmount;
      dailyMap[dateKey].count += 1;
    });

    return {
      range,
      totalRevenue,
      totalTransactions,
      trend: Object.values(dailyMap),
    };
  },

  // Calculate top selling medicines from actual sale item rows
  getTopMedicines: async (pharmacyId, limit = 5) => {
    const topItems = await Sale.aggregate([
      { $match: { pharmacy: pharmacyId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.medicine',
          medicineName: { $first: '$items.medicineName' },
          genericName: { $first: '$items.genericName' },
          unitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
    ]);

    return topItems;
  },

  // Calculate genuine inventory asset valuation
  getInventoryValuation: async (pharmacyId) => {
    const batches = await Batch.find({ pharmacy: pharmacyId });
    let totalPurchaseCost = 0;
    let totalRetailValue = 0;
    let totalUnits = 0;

    batches.forEach((b) => {
      totalPurchaseCost += (b.quantity || 0) * (b.purchasePrice || 0);
      totalRetailValue += (b.quantity || 0) * (b.sellingPrice || 0);
      totalUnits += b.quantity || 0;
    });

    const potentialGrossProfit = totalRetailValue - totalPurchaseCost;
    const grossMarginPercent =
      totalRetailValue > 0 ? ((potentialGrossProfit / totalRetailValue) * 100).toFixed(1) : 0;

    return {
      totalUnits,
      totalBatches: batches.length,
      totalPurchaseCost: Number(totalPurchaseCost.toFixed(2)),
      totalRetailValue: Number(totalRetailValue.toFixed(2)),
      potentialGrossProfit: Number(potentialGrossProfit.toFixed(2)),
      grossMarginPercent: Number(grossMarginPercent),
    };
  },
};

module.exports = analyticsService;
