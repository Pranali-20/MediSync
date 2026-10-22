const express = require('express');
const router = express.Router();
const {
  getInventory,
  getLowStock,
  getOutOfStock,
  getExpiry,
  adjustStock,
  getTransactions,
} = require('../controllers/inventoryController');
const { protect, requirePharmacy } = require('../middleware/authMiddleware');

router.use(protect, requirePharmacy);

router.get('/', getInventory);
router.get('/low-stock', getLowStock);
router.get('/out-of-stock', getOutOfStock);
router.get('/expiry', getExpiry);
router.get('/expiring', getExpiry);
router.get('/transactions', getTransactions);

router.post('/adjust', adjustStock);

module.exports = router;
