const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  addBatch,
  updateBatch,
  deleteBatch,
  searchMedicines,
  getMedicineByBarcode,
} = require('../controllers/medicineController');
const { protect, requirePharmacy } = require('../middleware/authMiddleware');
const { validateMedicine, validateBatch } = require('../middleware/validationMiddleware');

router.use(protect, requirePharmacy);

router.get('/search', searchMedicines);
router.get('/barcode/:barcode', getMedicineByBarcode);

router.route('/')
  .get(getMedicines)
  .post(validateMedicine, createMedicine);

router.route('/:id')
  .get(getMedicineById)
  .put(updateMedicine)
  .delete(deleteMedicine);

router.post('/:id/batches', validateBatch, addBatch);
router.put('/:id/batches/:batchId', updateBatch);
router.delete('/:id/batches/:batchId', deleteBatch);

module.exports = router;
