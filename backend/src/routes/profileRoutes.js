const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updatePassword,
  getSettings,
  updateSettings,
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getProfile)
  .put(updateProfile);

router.put('/password', updatePassword);

router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
