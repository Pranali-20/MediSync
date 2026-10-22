const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const InventoryTransaction = require('../models/InventoryTransaction');
const inventoryService = require('../services/inventoryService');
const expiryService = require('../services/expiryService');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get full inventory with detailed stock status and batch breakdown
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = { pharmacy: req.pharmacyId };

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { genericName: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { barcode: { $regex: term, $options: 'i' } },
      ];
    }

    if (status === 'Low') {
      query.$expr = { $lte: ['$totalStock', '$minStockAlert'] };
    } else if (status === 'Out of Stock') {
      query.totalStock = 0;
    }

    const medicines = await Medicine.find(query).sort({ updatedAt: -1 });
    const batches = await Batch.find({ pharmacy: req.pharmacyId }).sort({ expiryDate: 1 });

    const inventoryList = medicines.map((m) => {
      const medBatches = batches.filter((b) => b.medicine.toString() === m._id.toString());
      
      const totalStock = m.totalStock || 0;
      const reservedStock = medBatches.reduce((sum, b) => sum + (b.reservedQuantity || 0), 0);
      const damagedStock = medBatches.reduce((sum, b) => sum + (b.damagedQuantity || 0), 0);
      const now = new Date();
      const expiredStock = medBatches
        .filter((b) => b.expiryDate && new Date(b.expiryDate) < now)
        .reduce((sum, b) => sum + (b.quantity || 0), 0);

      const usableStock = Math.max(0, totalStock - reservedStock - damagedStock - expiredStock);

      let stockStatus = 'IN STOCK';
      if (totalStock === 0) stockStatus = 'OUT OF STOCK';
      else if (expiredStock > 0 && usableStock === 0) stockStatus = 'EXPIRED';
      else if (usableStock <= m.minStockAlert * 0.5) stockStatus = 'LOW STOCK';
      else if (usableStock <= m.minStockAlert) stockStatus = 'LOW STOCK';

      return {
        ...m.toObject(),
        batches: medBatches,
        stockStatus,
        usableStock,
        reservedStock,
        damagedStock,
        expiredStock,
      };
    });

    return successResponse(res, inventoryList);
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock medicines
// @route   GET /api/inventory/low-stock
// @access  Private
const getLowStock = async (req, res, next) => {
  try {
    const lowStock = await Medicine.find({
      pharmacy: req.pharmacyId,
      $expr: { $lte: ['$totalStock', '$minStockAlert'] },
    }).sort({ totalStock: 1 });

    return successResponse(res, lowStock);
  } catch (error) {
    next(error);
  }
};

// @desc    Get out of stock medicines
// @route   GET /api/inventory/out-of-stock
// @access  Private
const getOutOfStock = async (req, res, next) => {
  try {
    const outOfStock = await Medicine.find({
      pharmacy: req.pharmacyId,
      totalStock: 0,
    });

    return successResponse(res, outOfStock);
  } catch (error) {
    next(error);
  }
};

// @desc    Get expiry breakdown (expired, within 7 days, within 30 days, within 60 days, safe)
// @route   GET /api/inventory/expiry
// @access  Private
const getExpiry = async (req, res, next) => {
  try {
    const batches = await Batch.find({ pharmacy: req.pharmacyId })
      .populate('medicine', 'name genericName category prescriptionRequired')
      .sort({ expiryDate: 1 });

    const now = new Date();
    const categorized = {
      expired: [],
      within7Days: [],
      within30Days: [],
      within60Days: [],
      safe: [],
    };

    batches.forEach((b) => {
      const exp = new Date(b.expiryDate);
      const diffTime = exp.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const bObj = b.toObject();
      bObj.daysRemaining = days;

      if (days < 0) {
        categorized.expired.push(bObj);
      } else if (days <= 7) {
        categorized.within7Days.push(bObj);
      } else if (days <= 30) {
        categorized.within30Days.push(bObj);
      } else if (days <= 60) {
        categorized.within60Days.push(bObj);
      } else {
        categorized.safe.push(bObj);
      }
    });

    return successResponse(res, categorized);
  } catch (error) {
    next(error);
  }
};

// @desc    Adjust batch stock with audit transaction & reason
// @route   POST /api/inventory/adjust
// @access  Private
const adjustStock = async (req, res, next) => {
  try {
    const {
      medicineId,
      batchId,
      type = 'ADJUSTMENT_OUT', // ADJUSTMENT_IN or ADJUSTMENT_OUT
      quantity,
      reason = 'Stock Correction', // Damaged, Expired, Lost, Stock Correction, Sample, Other
      notes = '',
    } = req.body;

    if (!medicineId || !batchId || !quantity) {
      return errorResponse(res, 'Medicine, Batch, and Quantity are required.', 400);
    }

    const adjQty = Number(quantity);
    if (adjQty <= 0) {
      return errorResponse(res, 'Adjustment quantity must be greater than zero.', 400);
    }

    const medicine = await Medicine.findOne({ _id: medicineId, pharmacy: req.pharmacyId });
    if (!medicine) return errorResponse(res, 'Medicine not found.', 404);

    const batch = await Batch.findOne({ _id: batchId, medicine: medicineId, pharmacy: req.pharmacyId });
    if (!batch) return errorResponse(res, 'Batch not found.', 404);

    const previousBatchQty = batch.quantity;
    let newBatchQty = previousBatchQty;

    if (type === 'ADJUSTMENT_IN') {
      newBatchQty = previousBatchQty + adjQty;
    } else {
      if (previousBatchQty < adjQty) {
        return errorResponse(
          res,
          `Cannot deduct ${adjQty} units. Only ${previousBatchQty} units currently in batch ${batch.batchNumber}.`,
          400
        );
      }
      newBatchQty = previousBatchQty - adjQty;

      if (reason === 'Damaged') {
        batch.damagedQuantity = (batch.damagedQuantity || 0) + adjQty;
      }
    }

    batch.quantity = newBatchQty;
    await batch.save();

    const updatedMedicine = await inventoryService.recalculateMedicineStock(medicineId);

    // Record InventoryTransaction
    await inventoryService.recordTransaction({
      pharmacyId: req.pharmacyId,
      medicineId: medicine._id,
      medicineName: medicine.name,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      type,
      quantity: adjQty,
      previousStock: previousBatchQty,
      newStock: newBatchQty,
      reason: `${reason}${notes ? ` - ${notes}` : ''}`,
      reference: 'Stock Adjustment',
      createdBy: req.userId,
    });

    // Audit Log
    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'STOCK_ADJUSTMENT',
      entity: 'Batch',
      entityId: batch._id,
      description: `Stock adjusted for ${medicine.name} (Batch ${batch.batchNumber}): ${previousBatchQty} → ${newBatchQty} (${type}, Reason: ${reason})`,
      oldValue: { quantity: previousBatchQty },
      newValue: { quantity: newBatchQty, reason, notes },
    });

    return successResponse(
      res,
      {
        medicine: updatedMedicine,
        batch,
      },
      `Stock adjusted: Batch ${batch.batchNumber} is now ${newBatchQty} units.`
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory audit transactions
// @route   GET /api/inventory/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, type, medicineId } = req.query;
    const query = { pharmacy: req.pharmacyId };

    if (type && type !== 'ALL') {
      query.type = type;
    }
    if (medicineId) {
      query.medicine = medicineId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await InventoryTransaction.countDocuments(query);
    const transactions = await InventoryTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('medicine', 'name genericName dosageForm strength unit')
      .populate('createdBy', 'name email role');

    return successResponse(res, {
      transactions,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getLowStock,
  getOutOfStock,
  getExpiry,
  adjustStock,
  getTransactions,
};
