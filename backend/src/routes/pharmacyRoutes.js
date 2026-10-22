const express = require('express');
const router = express.Router();
const {
  getPharmacy,
  updatePharmacy,
  updatePharmacyType,
} = require('../controllers/pharmacyController');
const { protect, requirePharmacy } = require('../middleware/authMiddleware');

router.use(protect);
router.use(requirePharmacy);

router.route('/')
  .get(getPharmacy)
  .put(updatePharmacy);

router.route('/type')
  .put(updatePharmacyType);

module.exports = router;
