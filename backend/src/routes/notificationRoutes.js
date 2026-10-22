const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  clearAll,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.post('/clear-all', clearAll);

module.exports = router;
