const express = require('express');
const router = express.Router();
const {
  getSalesAnalytics,
  getTopMedicines,
  getInventoryAnalytics,
  getAnalyticsSummary,
} = require('../controllers/analyticsController');
const { protect, requirePharmacy } = require('../middleware/authMiddleware');

router.use(protect, requirePharmacy);

router.get('/sales', getSalesAnalytics);
router.get('/top-medicines', getTopMedicines);
router.get('/inventory', getInventoryAnalytics);
router.get('/summary', getAnalyticsSummary);

module.exports = router;
