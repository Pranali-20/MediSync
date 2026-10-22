const express = require('express');
const router = express.Router();
const {
  getPatients,
  createPatient,
  getPatientById,
  updatePatient,
  deletePatient,
} = require('../controllers/patientController');
const { protect, requirePharmacy, requireHospitalOrHybrid } = require('../middleware/authMiddleware');

router.use(protect);
router.use(requirePharmacy);
router.use(requireHospitalOrHybrid);

router.route('/')
  .get(getPatients)
  .post(createPatient);

router.route('/:id')
  .get(getPatientById)
  .put(updatePatient)
  .delete(deletePatient);

module.exports = router;
