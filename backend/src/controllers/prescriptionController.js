const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const InventoryTransaction = require('../models/InventoryTransaction');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get all prescriptions with search and filter
// @route   GET /api/prescriptions
// @access  Private (Hospital & Hybrid)
const getPrescriptions = async (req, res, next) => {
  try {
    const { status, search = '', patientId, page = 1, limit = 50 } = req.query;
    const pharmacyId = req.pharmacyId;

    const query = { pharmacy: pharmacyId };
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (patientId) {
      query.patient = patientId;
    }
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { prescriptionNumber: { $regex: term, $options: 'i' } },
        { patientName: { $regex: term, $options: 'i' } },
        { doctorName: { $regex: term, $options: 'i' } },
        { department: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Prescription.countDocuments(query);
    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('patient', 'patientId name phone age gender hospitalId')
      .populate('items.medicine', 'name genericName totalStock dosageForm strength unit');

    return successResponse(res, {
      prescriptions,
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

// @desc    Create new Prescription
// @route   POST /api/prescriptions
// @access  Private (Hospital & Hybrid)
const createPrescription = async (req, res, next) => {
  try {
    const pharmacyId = req.pharmacyId;
    const {
      prescriptionNumber,
      patientId,
      doctorName,
      department = 'General Medicine',
      prescriptionDate = new Date(),
      items = [],
      notes = '',
    } = req.body;

    if (!patientId) {
      return errorResponse(res, 'Patient is required.', 400);
    }
    if (!doctorName || !doctorName.trim()) {
      return errorResponse(res, 'Doctor name is required.', 400);
    }
    if (!items || !items.length) {
      return errorResponse(res, 'At least one medicine item is required.', 400);
    }

    const patient = await Patient.findOne({ _id: patientId, pharmacy: pharmacyId });
    if (!patient) {
      return errorResponse(res, 'Selected patient not found.', 404);
    }

    let rxNumber = prescriptionNumber ? prescriptionNumber.trim() : '';
    if (!rxNumber) {
      const count = await Prescription.countDocuments({ pharmacy: pharmacyId });
      rxNumber = 'RX-' + new Date().getFullYear() + '-' + String(count + 1001).padStart(4, '0');
    }

    const formattedItems = [];
    for (const item of items) {
      const med = await Medicine.findOne({ _id: item.medicine, pharmacy: pharmacyId });
      if (!med) {
        return errorResponse(res, 'Medicine not found: ' + item.medicine, 400);
      }
      formattedItems.push({
        medicine: med._id,
        medicineName: med.name,
        dosageInstructions: item.dosageInstructions || '',
        quantityPrescribed: Number(item.quantityPrescribed) || 1,
        quantityDispensed: 0,
      });
    }

    const prescription = await Prescription.create({
      pharmacy: pharmacyId,
      prescriptionNumber: rxNumber,
      patient: patient._id,
      patientName: patient.name,
      doctorName: doctorName.trim(),
      department: department.trim(),
      prescriptionDate: new Date(prescriptionDate),
      status: 'PENDING',
      items: formattedItems,
      notes,
    });

    await auditService.log({
      pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PRESCRIPTION_CREATED',
      entity: 'Prescription',
      entityId: prescription._id,
      description: `Created Prescription ${rxNumber} for patient ${patient.name} (Doctor: ${doctorName})`,
    });

    return successResponse(res, prescription, 'Prescription registered in hospital queue.', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single prescription by ID with FEFO batch availability
// @route   GET /api/prescriptions/:id
// @access  Private (Hospital & Hybrid)
const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    })
      .populate('patient')
      .populate('items.medicine');

    if (!prescription) {
      return errorResponse(res, 'Prescription not found.', 404);
    }

    // Attach real-time available batches in FEFO order for each prescribed item
    const itemsWithBatches = await Promise.all(
      prescription.items.map(async (item) => {
        const itemObj = item.toObject();
        const batches = await Batch.find({
          pharmacy: req.pharmacyId,
          medicine: item.medicine ? item.medicine._id : null,
          quantity: { $gt: 0 },
        }).sort({ expiryDate: 1 });

        return {
          ...itemObj,
          availableBatches: batches.map((b) => ({
            _id: b._id,
            batchNumber: b.batchNumber,
            quantity: b.quantity,
            usableStock: b.usableStock,
            expiryDate: b.expiryDate,
            sellingPrice: b.sellingPrice,
          })),
        };
      })
    );

    return successResponse(res, {
      ...prescription.toObject(),
      items: itemsWithBatches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update prescription details
// @route   PUT /api/prescriptions/:id
// @access  Private
const updatePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!prescription) {
      return errorResponse(res, 'Prescription not found.', 404);
    }

    const { doctorName, department, notes, status } = req.body;

    if (doctorName !== undefined) prescription.doctorName = doctorName.trim();
    if (department !== undefined) prescription.department = department.trim();
    if (notes !== undefined) prescription.notes = notes.trim();
    if (status !== undefined && ['CANCELLED'].includes(status)) {
      if (prescription.status === 'DISPENSED') {
        return errorResponse(res, 'Cannot cancel already dispensed prescription.', 400);
      }
      prescription.status = status;
    }

    await prescription.save();
    return successResponse(res, prescription, 'Prescription updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Dispense medicines for prescription with FEFO inventory deduction & partial support
// @route   POST /api/prescriptions/:id/dispense
// @access  Private (Hospital & Hybrid)
const dispensePrescription = async (req, res, next) => {
  try {
    const pharmacyId = req.pharmacyId;
    const { itemsToDispense = [], notes = '' } = req.body;

    const prescription = await Prescription.findOne({
      _id: req.params.id,
      pharmacy: pharmacyId,
    });

    if (!prescription) {
      return errorResponse(res, 'Prescription not found.', 404);
    }

    if (prescription.status === 'DISPENSED' || prescription.status === 'CANCELLED') {
      return errorResponse(res, 'Prescription is already ' + prescription.status.toLowerCase() + '.', 400);
    }

    const dispenseLog = [];

    // Process each item to dispense
    for (const dispItem of itemsToDispense) {
      const rxItem = prescription.items.find(
        (i) => i.medicine.toString() === dispItem.medicineId || i._id.toString() === dispItem.itemId
      );

      if (!rxItem) continue;

      const remainingNeeded = rxItem.quantityPrescribed - rxItem.quantityDispensed;
      const qtyToDispense = Math.min(Number(dispItem.quantity) || remainingNeeded, remainingNeeded);

      if (qtyToDispense <= 0) continue;

      // 1. Fetch available batches in FEFO order (Earliest Expiry First)
      let batches = [];
      if (dispItem.batchId) {
        const specifiedBatch = await Batch.findOne({
          _id: dispItem.batchId,
          pharmacy: pharmacyId,
          quantity: { $gt: 0 },
        });
        if (specifiedBatch) batches = [specifiedBatch];
      }

      if (!batches.length) {
        batches = await Batch.find({
          pharmacy: pharmacyId,
          medicine: rxItem.medicine,
          quantity: { $gt: 0 },
        }).sort({ expiryDate: 1 });
      }

      const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < qtyToDispense) {
        return errorResponse(
          res,
          'Insufficient stock for ' + rxItem.medicineName + '. Needed: ' + qtyToDispense + ', Available: ' + totalAvailable,
          400
        );
      }

      let remainingToDeduct = qtyToDispense;
      const med = await Medicine.findById(rxItem.medicine);

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const deductFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
        const prevBatchQty = batch.quantity;
        batch.quantity -= deductFromThisBatch;
        remainingToDeduct -= deductFromThisBatch;
        await batch.save();

        const updatedMed = await inventoryService.recalculateMedicineStock(rxItem.medicine);

        // Record InventoryTransaction (PRESCRIPTION_DISPENSING)
        await inventoryService.recordTransaction({
          pharmacyId,
          medicineId: rxItem.medicine,
          medicineName: rxItem.medicineName,
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          type: 'PRESCRIPTION_DISPENSING',
          quantity: deductFromThisBatch,
          previousStock: prevBatchQty,
          newStock: batch.quantity,
          reason: 'Hospital Rx Dispensing: ' + prescription.prescriptionNumber,
          reference: prescription.prescriptionNumber,
          createdBy: req.userId,
        });

        dispenseLog.push({
          medicine: rxItem.medicine,
          medicineName: rxItem.medicineName,
          batch: batch._id,
          batchNumber: batch.batchNumber,
          quantity: deductFromThisBatch,
        });
      }

      rxItem.quantityDispensed += qtyToDispense;
    }

    if (!dispenseLog.length) {
      return errorResponse(res, 'No items were eligible to dispense.', 400);
    }

    // Determine new status: DISPENSED or PARTIALLY_DISPENSED
    const allFullyDispensed = prescription.items.every(
      (item) => item.quantityDispensed >= item.quantityPrescribed
    );

    prescription.status = allFullyDispensed ? 'DISPENSED' : 'PARTIALLY_DISPENSED';
    prescription.dispensedBy = req.userId;
    prescription.dispensedByName = req.user.name || 'Pharmacist';
    prescription.dispensedAt = new Date();

    prescription.dispensingHistory.push({
      dispensedAt: new Date(),
      dispensedBy: req.userId,
      dispensedByName: req.user.name || 'Pharmacist',
      items: dispenseLog,
      notes,
    });

    await prescription.save();

    await auditService.log({
      pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PRESCRIPTION_DISPENSED',
      entity: 'Prescription',
      entityId: prescription._id,
      description: `Dispensed Rx ${prescription.prescriptionNumber} for ${prescription.patientName} (Status: ${prescription.status})`,
      newValue: { status: prescription.status, dispensedItems: dispenseLog },
    });

    return successResponse(
      res,
      {
        prescription,
        dispensedItems: dispenseLog,
        status: prescription.status,
      },
      'Prescription ' + (allFullyDispensed ? 'fully dispensed' : 'partially dispensed') + ' and stock updated.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrescriptions,
  createPrescription,
  getPrescriptionById,
  updatePrescription,
  dispensePrescription,
};
