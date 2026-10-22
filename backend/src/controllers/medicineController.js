const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Supplier = require('../models/Supplier');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get all medicines for authenticated pharmacy
// @route   GET /api/medicines
// @access  Private
const getMedicines = async (req, res, next) => {
  try {
    const { search, category, stockStatus, page = 1, limit = 100 } = req.query;
    const query = { pharmacy: req.pharmacyId };

    if (search && search.trim()) {
      const term = search.trim();
      const matchingBatches = await Batch.find({
        pharmacy: req.pharmacyId,
        batchNumber: { $regex: term, $options: 'i' },
      }).select('medicine');
      const batchMedIds = matchingBatches.map((b) => b.medicine).filter(Boolean);

      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { genericName: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { manufacturer: { $regex: term, $options: 'i' } },
        { barcode: { $regex: term, $options: 'i' } },
        ...(batchMedIds.length > 0 ? [{ _id: { $in: batchMedIds } }] : []),
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (stockStatus && stockStatus !== 'All') {
      if (stockStatus === 'Out of Stock') {
        query.totalStock = 0;
      } else if (stockStatus === 'Low') {
        query.$expr = { $lte: ['$totalStock', '$minStockAlert'] };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const medicineIds = medicines.map((m) => m._id);
    const batches = await Batch.find({
      medicine: { $in: medicineIds },
      pharmacy: req.pharmacyId,
    }).sort({ expiryDate: 1 });

    const medicinesWithBatches = medicines.map((m) => {
      const medObj = m.toObject();
      medObj.batches = batches.filter((b) => b.medicine.toString() === m._id.toString());
      medObj.activeBatchesCount = medObj.batches.filter((b) => b.quantity > 0).length;
      return medObj;
    });

    return successResponse(res, {
      medicines: medicinesWithBatches,
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

// @desc    Fast search medicines by keyword across multiple fields
// @route   GET /api/medicines/search
// @access  Private
const searchMedicines = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    if (!q || !q.trim()) {
      return successResponse(res, []);
    }

    const term = q.trim();
    // Also search batch numbers
    const matchingBatches = await Batch.find({
      pharmacy: req.pharmacyId,
      batchNumber: { $regex: term, $options: 'i' },
    }).select('medicine');

    const batchMedIds = matchingBatches.map((b) => b.medicine);

    const medicines = await Medicine.find({
      pharmacy: req.pharmacyId,
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { genericName: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { barcode: { $regex: term, $options: 'i' } },
        { manufacturer: { $regex: term, $options: 'i' } },
        { _id: { $in: batchMedIds } },
      ],
    }).limit(20);

    const medIds = medicines.map((m) => m._id);
    const batches = await Batch.find({
      medicine: { $in: medIds },
      pharmacy: req.pharmacyId,
    }).sort({ expiryDate: 1 });

    const results = medicines.map((m) => {
      const medObj = m.toObject();
      medObj.batches = batches.filter((b) => b.medicine.toString() === m._id.toString());
      return medObj;
    });

    return successResponse(res, results);
  } catch (error) {
    next(error);
  }
};

// @desc    Lookup medicine and its batches by barcode
// @route   GET /api/medicines/barcode/:barcode
// @access  Private
const getMedicineByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const medicine = await Medicine.findOne({
      pharmacy: req.pharmacyId,
      barcode: barcode.trim(),
    });

    if (!medicine) {
      // Check if barcode matches a batch directly
      const batch = await Batch.findOne({
        pharmacy: req.pharmacyId,
        barcode: barcode.trim(),
      }).populate('medicine');

      if (batch && batch.medicine) {
        const allBatches = await Batch.find({
          pharmacy: req.pharmacyId,
          medicine: batch.medicine._id,
        }).sort({ expiryDate: 1 });

        const medObj = batch.medicine.toObject();
        medObj.batches = allBatches;
        medObj.matchedBatch = batch;
        return successResponse(res, medObj);
      }

      return errorResponse(res, 'No medicine found with barcode: ' + barcode, 404);
    }

    const batches = await Batch.find({
      pharmacy: req.pharmacyId,
      medicine: medicine._id,
    }).sort({ expiryDate: 1 });

    const medObj = medicine.toObject();
    medObj.batches = batches;

    return successResponse(res, medObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single medicine by ID with full batch breakdown
// @route   GET /api/medicines/:id
// @access  Private
const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!medicine) {
      return errorResponse(res, 'Medicine not found.', 404);
    }

    const batches = await Batch.find({
      medicine: medicine._id,
      pharmacy: req.pharmacyId,
    }).sort({ expiryDate: 1 });

    const medObj = medicine.toObject();
    medObj.batches = batches;

    return successResponse(res, medObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new master medicine record (and optional initial batch)
// @route   POST /api/medicines
// @access  Private
const createMedicine = async (req, res, next) => {
  try {
    const {
      name,
      genericName,
      brand,
      category,
      manufacturer,
      dosageForm,
      strength,
      unit,
      minStockAlert,
      reorderQuantity,
      purchasePrice,
      sellingPrice,
      location,
      prescriptionRequired,
      barcode,
      description,
      batchNumber,
      quantity,
      expiryDate,
      manufacturingDate,
      supplierId,
    } = req.body;

    if (!name || !genericName) {
      return errorResponse(res, 'Medicine name and generic salt name are required.', 400);
    }

    const medicine = await Medicine.create({
      pharmacy: req.pharmacyId,
      name: name.trim(),
      genericName: genericName.trim(),
      brand: brand ? brand.trim() : '',
      category: category || 'General',
      manufacturer: manufacturer || 'General Pharmaceuticals',
      dosageForm: dosageForm || 'Tablet',
      strength: strength || '500mg',
      unit: unit || 'Strip',
      minStockAlert: Number(minStockAlert) || 20,
      reorderQuantity: Number(reorderQuantity) || 50,
      totalStock: 0,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      location: location || 'Rack A - Shelf 1',
      prescriptionRequired: Boolean(prescriptionRequired),
      barcode: barcode ? barcode.trim() : '',
      description: description || '',
    });

    let createdBatch = null;

    if (batchNumber && (quantity !== undefined || expiryDate)) {
      const initialQty = Number(quantity) || 0;
      let supplierName = 'Authorized Distributor';
      if (supplierId) {
        const sup = await Supplier.findById(supplierId);
        if (sup) supplierName = sup.name;
      }

      createdBatch = await Batch.create({
        medicine: medicine._id,
        pharmacy: req.pharmacyId,
        batchNumber: batchNumber.trim(),
        quantity: initialQty,
        initialQuantity: initialQty,
        unit: unit || 'Units',
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        supplier: supplierId || null,
        supplierName,
        barcode: barcode || '',
      });

      medicine.totalStock = initialQty;
      await medicine.save();

      if (initialQty > 0) {
        await inventoryService.recordTransaction({
          pharmacyId: req.pharmacyId,
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchId: createdBatch._id,
          batchNumber: createdBatch.batchNumber,
          type: 'PURCHASE',
          quantity: initialQty,
          previousStock: 0,
          newStock: initialQty,
          reason: 'Initial Opening Stock Entry',
          reference: 'Master Setup',
          createdBy: req.userId,
        });
      }
    }

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_CREATED',
      entity: 'Medicine',
      entityId: medicine._id,
      description: `Created medicine master: ${medicine.name} (${medicine.dosageForm} ${medicine.strength})`,
      newValue: { name: medicine.name, category: medicine.category, totalStock: medicine.totalStock },
    });

    const medObj = medicine.toObject();
    medObj.batches = createdBatch ? [createdBatch] : [];

    return successResponse(res, medObj, 'Medicine created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new batch to an EXISTING medicine
// @route   POST /api/medicines/:id/batches
// @access  Private
const addBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      batchNumber,
      quantity,
      purchasePrice,
      sellingPrice,
      manufacturingDate,
      expiryDate,
      supplierId,
    } = req.body;

    if (!batchNumber || quantity === undefined || !expiryDate) {
      return errorResponse(res, 'Batch number, quantity, and expiry date are required.', 400);
    }

    const medicine = await Medicine.findOne({ _id: id, pharmacy: req.pharmacyId });
    if (!medicine) {
      return errorResponse(res, 'Medicine not found.', 404);
    }

    let supplierName = 'Authorized Distributor';
    let supplierObj = null;
    if (supplierId) {
      supplierObj = await Supplier.findOne({ _id: supplierId, pharmacy: req.pharmacyId });
      if (supplierObj) supplierName = supplierObj.name;
    }

    const newQty = Number(quantity) || 0;
    const pPrice = Number(purchasePrice) || medicine.purchasePrice || 0;
    const sPrice = Number(sellingPrice) || medicine.sellingPrice || Number((pPrice * 1.2).toFixed(2));

    let batch = await Batch.findOne({
      pharmacy: req.pharmacyId,
      medicine: medicine._id,
      batchNumber: batchNumber.trim(),
    });

    const prevStock = medicine.totalStock;

    if (batch) {
      batch.quantity += newQty;
      batch.purchasePrice = pPrice;
      batch.sellingPrice = sPrice;
      batch.expiryDate = new Date(expiryDate);
      if (manufacturingDate) batch.manufacturingDate = new Date(manufacturingDate);
      await batch.save();
    } else {
      batch = await Batch.create({
        medicine: medicine._id,
        pharmacy: req.pharmacyId,
        batchNumber: batchNumber.trim(),
        quantity: newQty,
        initialQuantity: newQty,
        unit: medicine.unit || 'Units',
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : new Date(),
        expiryDate: new Date(expiryDate),
        supplier: supplierId || null,
        supplierName,
      });
    }

    const updatedMedicine = await inventoryService.recalculateMedicineStock(medicine._id);

    if (newQty > 0) {
      await inventoryService.recordTransaction({
        pharmacyId: req.pharmacyId,
        medicineId: medicine._id,
        medicineName: medicine.name,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        type: 'PURCHASE',
        quantity: newQty,
        previousStock: prevStock,
        newStock: updatedMedicine.totalStock,
        reason: `Added new batch ${batch.batchNumber}`,
        reference: 'Manual Batch Inward',
        createdBy: req.userId,
      });
    }

    if (supplierObj) {
      supplierObj.priceHistory.push({
        medicine: medicine._id,
        medicineName: medicine.name,
        batchNumber: batch.batchNumber,
        price: pPrice,
        date: new Date(),
        invoiceNumber: 'Direct Inward',
      });
      await supplierObj.save();
    }

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BATCH_CREATED',
      entity: 'Batch',
      entityId: batch._id,
      description: `Added Lot #${batch.batchNumber} (+${newQty} units) to ${medicine.name}`,
      newValue: { batchNumber: batch.batchNumber, quantity: newQty, expiryDate: batch.expiryDate },
    });

    return successResponse(res, {
      batch,
      medicine: updatedMedicine,
    }, `Batch ${batch.batchNumber} added successfully. Total stock updated to ${updatedMedicine.totalStock}.`, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PUT /api/medicines/:id/batches/:batchId
// @access  Private
const updateBatch = async (req, res, next) => {
  try {
    const { id, batchId } = req.params;
    const batch = await Batch.findOne({
      _id: batchId,
      medicine: id,
      pharmacy: req.pharmacyId,
    });

    if (!batch) {
      return errorResponse(res, 'Batch not found.', 404);
    }

    const { purchasePrice, sellingPrice, expiryDate, batchNumber } = req.body;
    if (purchasePrice !== undefined) batch.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) batch.sellingPrice = Number(sellingPrice);
    if (expiryDate !== undefined) batch.expiryDate = new Date(expiryDate);
    if (batchNumber !== undefined) batch.batchNumber = batchNumber.trim();

    await batch.save();

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BATCH_UPDATED',
      entity: 'Batch',
      entityId: batch._id,
      description: `Updated details for Batch ${batch.batchNumber}`,
    });

    return successResponse(res, batch, 'Batch updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch
// @route   DELETE /api/medicines/:id/batches/:batchId
// @access  Private (Admin only)
const deleteBatch = async (req, res, next) => {
  try {
    const { id, batchId } = req.params;
    const batch = await Batch.findOne({
      _id: batchId,
      medicine: id,
      pharmacy: req.pharmacyId,
    });

    if (!batch) {
      return errorResponse(res, 'Batch not found.', 404);
    }

    await Batch.deleteOne({ _id: batch._id });
    const updatedMed = await inventoryService.recalculateMedicineStock(id);

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BATCH_DELETED',
      entity: 'Batch',
      entityId: batchId,
      description: `Deleted Batch ${batch.batchNumber} from medicine ${updatedMed ? updatedMed.name : id}`,
    });

    return successResponse(res, { batchId, medicine: updatedMed }, 'Batch removed.');
  } catch (error) {
    next(error);
  }
};

// @desc    Update master medicine details
// @route   PUT /api/medicines/:id
// @access  Private
const updateMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!medicine) {
      return errorResponse(res, 'Medicine not found.', 404);
    }

    const allowedFields = [
      'name',
      'genericName',
      'brand',
      'category',
      'manufacturer',
      'dosageForm',
      'strength',
      'unit',
      'minStockAlert',
      'reorderQuantity',
      'purchasePrice',
      'sellingPrice',
      'location',
      'prescriptionRequired',
      'barcode',
      'description',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        medicine[field] = req.body[field];
      }
    });

    await medicine.save();

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_UPDATED',
      entity: 'Medicine',
      entityId: medicine._id,
      description: `Updated master properties for ${medicine.name}`,
    });

    return successResponse(res, medicine, 'Medicine updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete medicine (and its batches)
// @route   DELETE /api/medicines/:id
// @access  Private (Admin only)
const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!medicine) {
      return errorResponse(res, 'Medicine not found.', 404);
    }

    await Batch.deleteMany({ medicine: medicine._id, pharmacy: req.pharmacyId });
    await Medicine.deleteOne({ _id: medicine._id });

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_DELETED',
      entity: 'Medicine',
      entityId: medicine._id,
      description: `Deleted master medicine: ${medicine.name}`,
    });

    return successResponse(res, { id: medicine._id }, 'Medicine and associated batches deleted.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMedicines,
  searchMedicines,
  getMedicineByBarcode,
  getMedicineById,
  createMedicine,
  addBatch,
  updateBatch,
  deleteBatch,
  updateMedicine,
  deleteMedicine,
};
