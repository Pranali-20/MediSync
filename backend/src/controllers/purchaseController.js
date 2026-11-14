const PurchaseOrder = require('../models/PurchaseOrder');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const InventoryTransaction = require('../models/InventoryTransaction');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// Generate unique PO Number (e.g. PO-2026-0001)
const generateOrderNumber = async (pharmacyId) => {
  const count = await PurchaseOrder.countDocuments({ pharmacy: pharmacyId });
  const year = new Date().getFullYear();
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
};

// Clean raw medicine name from distributor bills
const cleanMedicineName = (rawName) => {
  if (!rawName) return '';
  let name = String(rawName).trim();
  // Strip leading numbers e.g. "1.", "02 -", "#3"
  name = name.replace(/^#?\d+[\.\-\s\)]+/, '').trim();
  // Strip HSN/SAC codes
  name = name.replace(/\bHSN[:\s-]*\d+\b/gi, '').trim();
  // Strip tax or rate tags like "@12%", "GST 12%", "12% GST"
  name = name.replace(/\b(GST\s*\d+%?|\d+%\s*GST|@\s*\d+%)\b/gi, '').trim();
  // Strip embedded batch or expiry markers
  name = name.replace(/\b(B\.?\s*No[:\.]?|BATCH[:\.]?|EXP[:\.]?|MFG[:\.]?)\s*[\w\/-]+/gi, '').trim();
  // Strip pack indicators like "10x10", "1x10's", "10TAB", "10'S", "10 CAP"
  name = name.replace(/\b\d+\s*['xX*]\s*\d+('?s)?\b/gi, '').trim();
  // Remove repeated whitespaces
  name = name.replace(/\s{2,}/g, ' ').trim();
  return name;
};

// @desc    Get all purchase orders
// @route   GET /api/purchases
// @access  Private
const getPurchaseOrders = async (req, res, next) => {
  try {
    const { status, supplierId, search, page = 1, limit = 50 } = req.query;
    const query = { pharmacy: req.pharmacyId };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (supplierId) {
      query.supplier = supplierId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { supplierName: { $regex: term, $options: 'i' } },
        { 'items.medicineName': { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await PurchaseOrder.countDocuments(query);
    const orders = await PurchaseOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('supplier', 'name phone email leadTimeDays gstNumber')
      .populate('items.medicine', 'name genericName dosageForm strength unit');

    return successResponse(res, {
      orders,
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

// @desc    Get single purchase order by ID
// @route   GET /api/purchases/:id
// @access  Private
const getPurchaseOrderById = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    })
      .populate('supplier', 'name phone email leadTimeDays gstNumber address paymentTerms')
      .populate('items.medicine', 'name genericName dosageForm strength unit totalStock')
      .populate('receivedHistory.items.medicine', 'name genericName');

    if (!order) {
      return errorResponse(res, 'Purchase order not found.', 404);
    }

    return successResponse(res, order);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Purchase Order
// @route   POST /api/purchases
// @access  Private (Admin & Pharmacist)
const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierId, items = [], expectedDeliveryDate, notes = '', status = 'ORDERED' } = req.body;

    if (!supplierId) {
      return errorResponse(res, 'Supplier is required.', 400);
    }

    if (!items || !items.length) {
      return errorResponse(res, 'At least one medicine item is required for a purchase order.', 400);
    }

    const supplier = await Supplier.findOne({ _id: supplierId, pharmacy: req.pharmacyId });
    if (!supplier) {
      return errorResponse(res, 'Supplier not found.', 404);
    }

    const orderNumber = await generateOrderNumber(req.pharmacyId);
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const med = await Medicine.findOne({ _id: item.medicineId, pharmacy: req.pharmacyId });
      if (!med) {
        return errorResponse(res, `Medicine not found for ID: ${item.medicineId}`, 404);
      }

      const qty = Number(item.quantityOrdered) || Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || Number(med.purchasePrice) || 0;
      const subtotal = qty * price;
      totalAmount += subtotal;

      validatedItems.push({
        medicine: med._id,
        medicineName: med.name,
        genericName: med.genericName,
        quantityOrdered: qty,
        quantityReceived: 0,
        unitPrice: price,
        subtotal,
        expectedBatchNumber: item.expectedBatchNumber || '',
        status: 'PENDING',
      });
    }

    const order = await PurchaseOrder.create({
      pharmacy: req.pharmacyId,
      orderNumber,
      supplier: supplier._id,
      supplierName: supplier.name,
      status,
      items: validatedItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      notes,
      createdBy: req.userId,
      createdByName: req.user.name || 'Pharmacist',
    });

    // Update supplier total orders count
    supplier.totalOrders = (supplier.totalOrders || 0) + 1;
    await supplier.save();

    // Audit log
    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PURCHASE_ORDER_CREATED',
      entity: 'PurchaseOrder',
      entityId: order._id,
      description: `Created Purchase Order ${orderNumber} for supplier ${supplier.name} (Total: ₹${totalAmount.toFixed(2)})`,
      newValue: { orderNumber, totalAmount, itemsCount: validatedItems.length },
    });

    return successResponse(res, order, `Purchase Order ${orderNumber} created successfully.`, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Import distributor invoice and add items directly to inventory
// @route   POST /api/purchases/import-bill
// @access  Private
const importDistributorBill = async (req, res, next) => {
  try {
    const { supplierId, invoiceReference = 'Distributor Invoice', notes = '', items = [] } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'At least one medicine item is required to import a distributor bill.', 400);
    }

    // Filter valid medicine items (skip empty lines or noise)
    const validItems = items.filter((item) => {
      const rawName = String(item?.medicineName || item?.name || '').trim();
      const medName = cleanMedicineName(rawName) || rawName;
      const quantity = Number(item?.quantity || item?.qty || 0);
      return medName && medName.length >= 2 && quantity > 0;
    });

    if (validItems.length === 0) {
      return errorResponse(
        res,
        'No valid medicine rows detected in this bill. Please ensure each item has a medicine name and quantity.',
        400
      );
    }

    const supplier = supplierId ? await Supplier.findOne({ _id: supplierId, pharmacy: req.pharmacyId }) : null;
    if (supplierId && !supplier) {
      return errorResponse(res, 'Supplier not found.', 404);
    }
    const addedItems = [];
    let createdCount = 0;
    let updatedCount = 0;
    let totalValue = 0;

    for (const rawItem of validItems) {
      const item = rawItem || {};
      const rawMedName = String(item.medicineName || item.name || '').trim();
      const medicineName = cleanMedicineName(rawMedName) || rawMedName;
      const genericName = cleanMedicineName(String(item.genericName || item.name || '').trim()) || medicineName;
      const qty = Math.max(1, Number(item.quantity || item.qty || 1));
      const purchasePrice = Number(item.purchasePrice || item.unitPrice || item.price || 10);
      const sellingPrice = Number(item.sellingPrice || item.mrp || Number((purchasePrice * 1.25).toFixed(2)));

      // Fallback clean batch number if omitted in bill
      const currentYear = new Date().getFullYear();
      let batchNumber = String(item.batchNumber || item.batch || '').trim();
      if (!batchNumber) {
        batchNumber = `LOT-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Fallback safe 2-year expiry date if omitted in bill
      let expiryDateValue = item.expiryDate || item.expiry;
      if (!expiryDateValue || Number.isNaN(new Date(expiryDateValue).getTime())) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 2);
        expiryDateValue = `${futureDate.getFullYear()}-12-31`;
      }

      let medicine = await Medicine.findOne({
        pharmacy: req.pharmacyId,
        $or: [
          { name: { $regex: `^${medicineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
          { genericName: { $regex: `^${genericName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        ],
      });

      if (!medicine) {
        medicine = await Medicine.create({
          pharmacy: req.pharmacyId,
          name: medicineName,
          genericName: genericName || medicineName,
          brand: item.brand || '',
          category: item.category || 'General',
          manufacturer: item.manufacturer || 'Authorized Supplier',
          dosageForm: item.dosageForm || 'Tablet',
          strength: item.strength || '500mg',
          unit: item.unit || 'Strip',
          minStockAlert: Number(item.minStockAlert) || 20,
          reorderQuantity: Number(item.reorderQuantity) || Math.max(50, qty),
          totalStock: 0,
          purchasePrice,
          sellingPrice,
          location: item.location || 'General Stock',
          prescriptionRequired: Boolean(item.prescriptionRequired),
          barcode: item.barcode || '',
          description: `Imported from distributor invoice ${invoiceReference}`,
        });
        createdCount += 1;
      } else {
        medicine.purchasePrice = purchasePrice;
        if (sellingPrice > 0) medicine.sellingPrice = sellingPrice;
        await medicine.save();
      }

      const manufacturingDateValue = item.manufacturingDate || item.manufacturedOn || new Date().toISOString().slice(0, 10);

      let batch = await Batch.findOne({
        pharmacy: req.pharmacyId,
        medicine: medicine._id,
        batchNumber: batchNumber,
      });

      const previousStock = medicine.totalStock || 0;

      if (batch) {
        batch.quantity += qty;
        batch.initialQuantity = (batch.initialQuantity || 0) + qty;
        batch.purchasePrice = purchasePrice || batch.purchasePrice || 0;
        batch.sellingPrice = sellingPrice || batch.sellingPrice || 0;
        batch.manufacturingDate = manufacturingDateValue ? new Date(manufacturingDateValue) : batch.manufacturingDate;
        batch.expiryDate = expiryDateValue ? new Date(expiryDateValue) : batch.expiryDate;
        if (supplier) {
          batch.supplier = supplier._id;
          batch.supplierName = supplier.name;
        }
        await batch.save();
        updatedCount += 1;
      } else {
        batch = await Batch.create({
          pharmacy: req.pharmacyId,
          medicine: medicine._id,
          batchNumber,
          quantity: qty,
          initialQuantity: qty,
          unit: item.unit || 'Units',
          purchasePrice,
          sellingPrice,
          manufacturingDate: manufacturingDateValue ? new Date(manufacturingDateValue) : new Date(),
          expiryDate: new Date(expiryDateValue),
          supplier: supplier ? supplier._id : null,
          supplierName: supplier ? supplier.name : 'Authorized Distributor',
          barcode: item.barcode || '',
          minimumStockLevel: Number(item.minStockAlert) || 10,
          reorderPoint: Number(item.reorderQuantity) || Math.max(20, qty),
          reorderQuantity: Number(item.reorderQuantity) || Math.max(50, qty),
          status: 'Normal',
        });
      }

      const updatedMedicine = await inventoryService.recalculateMedicineStock(medicine._id);
      const receivedValue = Number((qty * purchasePrice).toFixed(2));
      totalValue += receivedValue;

      await inventoryService.recordTransaction({
        pharmacyId: req.pharmacyId,
        medicineId: medicine._id,
        medicineName: medicine.name,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        type: 'PURCHASE',
        quantity: qty,
        previousStock,
        newStock: updatedMedicine.totalStock,
        reason: `Distributor Invoice Import: ${invoiceReference}`,
        reference: invoiceReference,
        createdBy: req.userId,
      });

      if (supplier) {
        supplier.priceHistory.push({
          medicine: medicine._id,
          medicineName: medicine.name,
          batchNumber: batch.batchNumber,
          price: purchasePrice,
          date: new Date(),
          invoiceNumber: invoiceReference,
        });
        supplier.totalPurchasedAmount = (supplier.totalPurchasedAmount || 0) + receivedValue;
      }

      addedItems.push({
        medicineId: medicine._id,
        medicineName: medicine.name,
        batchNumber: batch.batchNumber,
        quantity: qty,
        purchasePrice,
        sellingPrice,
        expiredOn: batch.expiryDate,
      });
    }

    if (supplier) {
      await supplier.save();
    }

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DISTRIBUTOR_BILL_IMPORTED',
      entity: 'PurchaseOrder',
      description: `Imported distributor bill ${invoiceReference} for ${addedItems.length} medicines (₹${totalValue.toFixed(2)})`,
      newValue: { invoiceReference, items: addedItems },
    });

    return successResponse(res, {
      importedCount: addedItems.length,
      createdCount,
      updatedCount,
      totalValue: Number(totalValue.toFixed(2)),
      items: addedItems,
    }, `Distributor bill imported successfully. ${addedItems.length} medicines added to inventory.`, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Receive shipment against a Purchase Order
// @route   POST /api/purchases/:id/receive
// @access  Private (Admin & Pharmacist)
const receiveShipment = async (req, res, next) => {
  try {
    const { invoiceReference = '', notes = '', receivedItems = [] } = req.body;

    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!order) {
      return errorResponse(res, 'Purchase order not found.', 404);
    }

    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      return errorResponse(res, `Cannot receive items for order with status: ${order.status}`, 400);
    }

    if (!receivedItems || !receivedItems.length) {
      return errorResponse(res, 'At least one received item lot must be provided.', 400);
    }

    const supplier = await Supplier.findById(order.supplier);
    const receivingLogItems = [];

    for (const rItem of receivedItems) {
      const {
        medicineId,
        batchNumber,
        quantityReceived,
        purchasePrice,
        sellingPrice,
        manufacturingDate,
        expiryDate,
      } = rItem;

      if (!medicineId || !batchNumber || !quantityReceived || !expiryDate) {
        return errorResponse(res, 'Medicine, Batch Number, Quantity, and Expiry Date are required for each received lot.', 400);
      }

      const med = await Medicine.findOne({ _id: medicineId, pharmacy: req.pharmacyId });
      if (!med) {
        return errorResponse(res, `Medicine not found for ID: ${medicineId}`, 404);
      }

      const qty = Number(quantityReceived);
      const pPrice = Number(purchasePrice) || med.purchasePrice || 0;
      const sPrice = Number(sellingPrice) || med.sellingPrice || Number((pPrice * 1.2).toFixed(2));

      // 1. Find or create Batch record for this medicine & batchNumber
      let batch = await Batch.findOne({
        pharmacy: req.pharmacyId,
        medicine: med._id,
        batchNumber: batchNumber.trim(),
      });

      const prevStock = med.totalStock;

      if (batch) {
        // Increment existing batch quantity
        batch.quantity += qty;
        batch.purchasePrice = pPrice;
        batch.sellingPrice = sPrice;
        if (expiryDate) batch.expiryDate = new Date(expiryDate);
        if (manufacturingDate) batch.manufacturingDate = new Date(manufacturingDate);
        await batch.save();
      } else {
        // Create new Batch record
        batch = await Batch.create({
          pharmacy: req.pharmacyId,
          medicine: med._id,
          batchNumber: batchNumber.trim(),
          quantity: qty,
          initialQuantity: qty,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : new Date(),
          expiryDate: new Date(expiryDate),
          supplier: order.supplier,
          supplierName: order.supplierName,
          status: 'Normal',
        });
      }

      // 2. Recalculate medicine stock
      const updatedMed = await inventoryService.recalculateMedicineStock(med._id);

      // 3. Record InventoryTransaction (PURCHASE)
      await inventoryService.recordTransaction({
        pharmacyId: req.pharmacyId,
        medicineId: med._id,
        medicineName: med.name,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        type: 'PURCHASE',
        quantity: qty,
        previousStock: prevStock,
        newStock: updatedMed.totalStock,
        reason: `Goods Received: PO ${order.orderNumber}`,
        reference: invoiceReference || order.orderNumber,
        createdBy: req.userId,
      });

      // 4. Update Supplier price history and total spend
      if (supplier) {
        supplier.priceHistory.push({
          medicine: med._id,
          medicineName: med.name,
          batchNumber: batch.batchNumber,
          price: pPrice,
          date: new Date(),
          invoiceNumber: invoiceReference || order.orderNumber,
        });
        supplier.totalPurchasedAmount = (supplier.totalPurchasedAmount || 0) + (qty * pPrice);
      }

      // 5. Update PO Item status
      const poItem = order.items.find((i) => i.medicine.toString() === med._id.toString());
      if (poItem) {
        poItem.quantityReceived = (poItem.quantityReceived || 0) + qty;
        if (poItem.quantityReceived >= poItem.quantityOrdered) {
          poItem.status = 'RECEIVED';
        } else {
          poItem.status = 'PARTIALLY_RECEIVED';
        }
      }

      receivingLogItems.push({
        medicine: med._id,
        medicineName: med.name,
        batch: batch._id,
        batchNumber: batch.batchNumber,
        quantity: qty,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        manufacturingDate: batch.manufacturingDate,
        expiryDate: batch.expiryDate,
      });
    }

    if (supplier) {
      await supplier.save();
    }

    // Determine new PO status
    const allReceived = order.items.every((i) => i.quantityReceived >= i.quantityOrdered);
    const someReceived = order.items.some((i) => i.quantityReceived > 0);

    order.status = allReceived ? 'RECEIVED' : (someReceived ? 'PARTIALLY_RECEIVED' : order.status);

    if (order.status === 'RECEIVED' && supplier) {
      supplier.completedOrders = (supplier.completedOrders || 0) + 1;
      await supplier.save();
    }

    // Record receiving history log
    order.receivedHistory.push({
      receivedAt: new Date(),
      receivedBy: req.userId,
      receivedByName: req.user.name || 'Pharmacist',
      invoiceReference,
      items: receivingLogItems,
      notes,
    });

    await order.save();

    // Audit log
    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PURCHASE_ORDER_RECEIVED',
      entity: 'PurchaseOrder',
      entityId: order._id,
      description: `Received shipment for PO ${order.orderNumber} (Ref: ${invoiceReference || 'N/A'}, Items: ${receivingLogItems.length})`,
      newValue: { orderNumber: order.orderNumber, status: order.status, receivedItems: receivingLogItems },
    });

    return successResponse(res, order, `Shipment for ${order.orderNumber} received and inventory updated successfully.`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get supplier purchase price comparison history
// @route   GET /api/purchases/price-history
// @access  Private
const getPriceHistory = async (req, res, next) => {
  try {
    const { medicineId } = req.query;
    const suppliers = await Supplier.find({ pharmacy: req.pharmacyId });

    const history = [];
    suppliers.forEach((s) => {
      s.priceHistory.forEach((p) => {
        if (!medicineId || p.medicine.toString() === medicineId.toString()) {
          history.push({
            supplierId: s._id,
            supplierName: s.name,
            medicineId: p.medicine,
            medicineName: p.medicineName,
            batchNumber: p.batchNumber,
            price: p.price,
            date: p.date,
            invoiceNumber: p.invoiceNumber,
          });
        }
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return successResponse(res, history);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  importDistributorBill,
  receiveShipment,
  getPriceHistory,
};
