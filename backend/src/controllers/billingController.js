const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const { generateInvoiceNumber } = require('../utils/invoiceGenerator');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Process POS Billing and generate invoice
// @route   POST /api/billing/sales
// @access  Private
const createSale = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      doctorName,
      items,
      discountPercent = 0,
      paymentMethod = 'UPI',
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'At least one medicine item is required to generate a bill.', 400);
    }

    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const medicine = await Medicine.findOne({ _id: item.medicineId, pharmacy: req.pharmacyId });
      if (!medicine) {
        return errorResponse(res, `Medicine not found for ID: ${item.medicineId}`, 404);
      }

      let batch = null;
      if (item.batchId) {
        batch = await Batch.findOne({
          _id: item.batchId,
          medicine: item.medicineId,
          pharmacy: req.pharmacyId,
        });
      } else {
        // Automatically select FEFO batch (Earliest expiring with stock > 0)
        batch = await Batch.findOne({
          medicine: item.medicineId,
          pharmacy: req.pharmacyId,
          quantity: { $gt: 0 },
        }).sort({ expiryDate: 1 });
      }

      if (!batch) {
        return errorResponse(res, `No available stock batch found for ${medicine.name}`, 404);
      }

      const requestedQty = Number(item.quantity);
      if (requestedQty <= 0) {
        return errorResponse(res, `Invalid quantity for ${medicine.name}`, 400);
      }

      if (batch.quantity < requestedQty) {
        return errorResponse(
          res,
          `Insufficient stock for ${medicine.name} (Batch ${batch.batchNumber}). Requested: ${requestedQty}, Available: ${batch.quantity}`,
          400
        );
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : batch.sellingPrice;
      const itemSubtotal = unitPrice * requestedQty;
      subtotal += itemSubtotal;

      validatedItems.push({
        medicine: medicine._id,
        medicineName: medicine.name,
        genericName: medicine.genericName,
        batch: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: requestedQty,
        unitPrice,
        taxPercent: item.taxPercent || 12,
        subtotal: itemSubtotal,
        batchDoc: batch,
        medicineDoc: medicine,
      });
    }

    // Financial calculations
    const discPercent = Number(discountPercent) || 0;
    const discountAmount = (subtotal * discPercent) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxRate = 12; // 12% GST
    const taxAmount = (taxableAmount * taxRate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    const invoiceNumber = await generateInvoiceNumber(req.pharmacyId);

    // Deduct stock and record transactions
    for (const vItem of validatedItems) {
      const prevStock = vItem.batchDoc.quantity;
      vItem.batchDoc.quantity -= vItem.quantity;
      await vItem.batchDoc.save();

      const updatedMed = await inventoryService.recalculateMedicineStock(vItem.medicine);

      await inventoryService.recordTransaction({
        pharmacyId: req.pharmacyId,
        medicineId: vItem.medicine,
        medicineName: vItem.medicineName,
        batchId: vItem.batch,
        batchNumber: vItem.batchNumber,
        type: 'SALE',
        quantity: vItem.quantity,
        previousStock: prevStock,
        newStock: vItem.batchDoc.quantity,
        reason: 'Counter POS Sale',
        reference: invoiceNumber,
        createdBy: req.userId,
      });
    }

    const sale = await Sale.create({
      pharmacy: req.pharmacyId,
      invoiceNumber,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      doctorName: doctorName || '',
      items: validatedItems.map((v) => ({
        medicine: v.medicine,
        medicineName: v.medicineName,
        genericName: v.genericName,
        batch: v.batch,
        batchNumber: v.batchNumber,
        expiryDate: v.expiryDate,
        quantity: v.quantity,
        quantityReturned: 0,
        unitPrice: v.unitPrice,
        taxPercent: v.taxPercent,
        subtotal: v.subtotal,
      })),
      subtotal: Number(subtotal.toFixed(2)),
      discountPercent: discPercent,
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      paymentMethod,
      status: 'COMPLETED',
      createdBy: req.userId,
      pharmacistName: req.user.name || 'Pharmacist',
    });

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SALE_CREATED',
      entity: 'Sale',
      entityId: sale._id,
      description: `Generated Invoice ${invoiceNumber} for ${sale.customerName} (Total: ₹${totalAmount.toFixed(2)})`,
      newValue: { invoiceNumber, totalAmount, itemsCount: validatedItems.length },
    });

    return successResponse(res, sale, 'Bill generated and stock deducted successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Process customer sale return
// @route   POST /api/billing/sales/:id/return
// @access  Private
const processSaleReturn = async (req, res, next) => {
  try {
    const { returnItems, returnedItems, reason = 'Customer Return', refundPaymentMethod = 'CASH', notes = '' } = req.body;
    const itemsToProcess = returnItems || returnedItems || [];

    const sale = await Sale.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!sale) {
      return errorResponse(res, 'Sale invoice not found.', 404);
    }

    if (!itemsToProcess || !itemsToProcess.length) {
      return errorResponse(res, 'At least one item must be selected for return.', 400);
    }

    let refundTotal = 0;
    const processedReturnItems = [];

    for (const rItem of itemsToProcess) {
      const saleItem = sale.items.find(
        (i) => i._id.toString() === rItem.saleItemId || (i.medicine.toString() === rItem.medicineId && i.batch.toString() === rItem.batchId)
      );

      if (!saleItem) {
        return errorResponse(res, `Item not found in invoice: ${rItem.medicineName || rItem.saleItemId}`, 400);
      }

      const returnQty = Number(rItem.quantity);
      const remainingReturnable = saleItem.quantity - (saleItem.quantityReturned || 0);

      if (returnQty <= 0 || returnQty > remainingReturnable) {
        return errorResponse(
          res,
          `Invalid return quantity for ${saleItem.medicineName}. Maximum returnable: ${remainingReturnable}`,
          400
        );
      }

      const itemRefund = Number((saleItem.unitPrice * returnQty).toFixed(2));
      refundTotal += itemRefund;
      saleItem.quantityReturned = (saleItem.quantityReturned || 0) + returnQty;

      const condition = rItem.condition || 'SELLABLE'; // SELLABLE, DAMAGED, EXPIRED, NON_RESELLABLE

      // If condition is SELLABLE, add back to batch usable stock
      const batch = await Batch.findOne({ _id: saleItem.batch, pharmacy: req.pharmacyId });
      if (batch) {
        const prevQty = batch.quantity;
        if (condition === 'SELLABLE') {
          batch.quantity += returnQty;
        } else if (condition === 'DAMAGED') {
          batch.damagedQuantity = (batch.damagedQuantity || 0) + returnQty;
        }
        await batch.save();

        const updatedMed = await inventoryService.recalculateMedicineStock(saleItem.medicine);

        // Record InventoryTransaction
        await inventoryService.recordTransaction({
          pharmacyId: req.pharmacyId,
          medicineId: saleItem.medicine,
          medicineName: saleItem.medicineName,
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          type: 'RETURN',
          quantity: returnQty,
          previousStock: prevQty,
          newStock: batch.quantity,
          reason: `Customer Return (${condition}): Inv ${sale.invoiceNumber} - ${reason}`,
          reference: sale.invoiceNumber,
          createdBy: req.userId,
        });
      }

      processedReturnItems.push({
        medicine: saleItem.medicine,
        medicineName: saleItem.medicineName,
        batch: saleItem.batch,
        batchNumber: saleItem.batchNumber,
        quantity: returnQty,
        refundAmount: itemRefund,
        condition,
        reason,
      });
    }

    // Determine new sale status
    const allReturned = sale.items.every((i) => i.quantityReturned >= i.quantity);
    sale.status = allReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';

    sale.returns.push({
      returnDate: new Date(),
      items: processedReturnItems,
      refundTotal: Number(refundTotal.toFixed(2)),
      reason,
      processedBy: req.userId,
      processedByName: req.user.name || 'Pharmacist',
    });

    await sale.save();

    // Audit log
    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SALE_RETURN',
      entity: 'Sale',
      entityId: sale._id,
      description: `Processed return on Invoice ${sale.invoiceNumber} (Refund: ₹${refundTotal.toFixed(2)})`,
      newValue: { invoiceNumber: sale.invoiceNumber, refundTotal, items: processedReturnItems },
    });

    return successResponse(res, sale, `Return processed successfully. Refund: ₹${refundTotal.toFixed(2)}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sales
// @route   GET /api/billing/sales
// @access  Private
const getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const query = { pharmacy: req.pharmacyId };

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { invoiceNumber: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
        { 'items.medicineName': { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return successResponse(res, {
      sales,
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

// @desc    Get sale by ID
// @route   GET /api/billing/sales/:id
// @access  Private
const getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });
    if (!sale) {
      return errorResponse(res, 'Invoice not found.', 404);
    }
    return successResponse(res, sale);
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's sales metrics
// @route   GET /api/billing/today
// @access  Private
const getTodaySales = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaySales = await Sale.find({
      pharmacy: req.pharmacyId,
      createdAt: { $gte: startOfDay },
    });

    const totalRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const invoiceCount = todaySales.length;

    return successResponse(res, {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      invoiceCount,
      sales: todaySales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent sales
// @route   GET /api/billing/recent
// @access  Private
const getRecentSales = async (req, res, next) => {
  try {
    const recent = await Sale.find({ pharmacy: req.pharmacyId })
      .sort({ createdAt: -1 })
      .limit(10);

    return successResponse(res, recent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  processSaleReturn,
  getSales,
  getSaleById,
  getTodaySales,
  getRecentSales,
};
