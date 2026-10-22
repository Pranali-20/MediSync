const express = require('express');
const router = express.Router();
const {
  getInsights,
  getDemandForecast,
  getStockoutPrediction,
  getPurchaseRecommendation,
} = require('../controllers/aiController');
const { protect, requirePharmacy } = require('../middleware/authMiddleware');

router.use(protect, requirePharmacy);

router.get('/insights', getInsights);
router.get('/demand/:medicineId', getDemandForecast);
router.get('/stockout/:medicineId', getStockoutPrediction);
router.get('/purchase-recommendation/:medicineId', getPurchaseRecommendation);

module.exports = router;
