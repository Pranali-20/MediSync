const InventoryTransaction = require('../models/InventoryTransaction');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');

const inventoryService = {
  // Record inventory audit transaction
  recordTransaction: async ({
    pharmacyId,
    medicineId,
    medicineName,
    batchId = null,
    batchNumber = '',
    type,
    quantity,
    previousStock = 0,
    newStock = 0,
    reason = '',
    reference = '',
    createdBy = null,
  }) => {
    try {
      const transaction = await InventoryTransaction.create({
        pharmacy: pharmacyId,
        medicine: medicineId,
        medicineName,
        batch: batchId,
        batchNumber,
        type,
        quantity,
        previousStock,
        newStock,
        reason,
        reference,
        createdBy,
      });
      return transaction;
    } catch (error) {
      console.error('[InventoryService Transaction Error]:', error.message);
      throw error;
    }
  },

  // Recalculate and update total stock on a medicine from all active non-expired batches
  recalculateMedicineStock: async (medicineId) => {
    const batches = await Batch.find({ medicine: medicineId });
    const totalStock = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const medicine = await Medicine.findByIdAndUpdate(
      medicineId,
      { totalStock },
      { new: true }
    );
    return medicine;
  },

  // Get optimal FEFO batch for a medicine (Earliest Expiry with usable stock > 0)
  getFEFOBatches: async (pharmacyId, medicineId, requiredQty = 1) => {
    const now = new Date();
    const batches = await Batch.find({
      pharmacy: pharmacyId,
      medicine: medicineId,
      quantity: { $gt: 0 },
      expiryDate: { $gt: now },
    }).sort({ expiryDate: 1 });

    return batches;
  },
};

module.exports = inventoryService;
