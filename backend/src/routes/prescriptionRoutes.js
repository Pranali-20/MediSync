const express = require('express');
const router = express.Router();
const {
  getPrescriptions,
  createPrescription,
  getPrescriptionById,
  updatePrescription,
  dispensePrescription,
} = require('../controllers/prescriptionController');
const { protect, requirePharmacy, requireHospitalOrHybrid } = require('../middleware/authMiddleware');

router.use(protect);
router.use(requirePharmacy);
router.use(requireHospitalOrHybrid);

router.route('/')
  .get(getPrescriptions)
  .post(createPrescription);

router.route('/:id')
  .get(getPrescriptionById)
  .put(updatePrescription);

router.route('/:id/dispense')
  .post(dispensePrescription);

module.exports = router;
