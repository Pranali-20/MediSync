const express = require('express');
const router = express.Router();
const {
  createSale,
  processSaleReturn,
  getSales,
  getSaleById,
  getTodaySales,
  getRecentSales,
} = require('../controllers/billingController');
const { protect, requirePharmacy } = require('../middleware/authMiddleware');

router.use(protect, requirePharmacy);

router.route('/sales')
  .post(createSale)
  .get(getSales);

router.get('/sales/:id', getSaleById);
router.post('/sales/:id/return', processSaleReturn);
router.get('/today', getTodaySales);
router.get('/recent', getRecentSales);

// Invoices aliases for frontend convenience
router.get('/invoices', getSales);
router.post('/invoices', createSale);
router.get('/invoices/:id', getSaleById);
router.post('/invoices/:id/return', processSaleReturn);

module.exports = router;
