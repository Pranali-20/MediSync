const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUserRole } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.put('/:id/role', updateUserRole);

module.exports = router;
