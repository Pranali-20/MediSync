const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  importDistributorBill,
  receiveShipment,
  getPriceHistory,
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.post('/import-bill', importDistributorBill);
router.get('/price-history', getPriceHistory);

router.route('/:id')
  .get(getPurchaseOrderById);

router.post('/:id/receive', receiveShipment);

module.exports = router;
