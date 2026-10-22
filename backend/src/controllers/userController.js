const User = require('../models/User');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get all users in pharmacy
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ pharmacy: req.pharmacyId }).select('-password').sort({ createdAt: 1 });
    return successResponse(res, users);
  } catch (error) {
    next(error);
  }
};

// @desc    Add new team member to pharmacy
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'pharmacist', phone = '', licenseNumber = '', shiftHours = '09:00 AM - 05:00 PM' } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Name, Email, and Password are required.', 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return errorResponse(res, 'A user with this email address already exists.', 400);
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      pharmacy: req.pharmacyId,
      phone,
      licenseNumber,
      shiftHours,
      isActive: true,
    });

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: newUser._id,
      description: `Added new user ${newUser.name} (${newUser.email}) with role: ${newUser.role}`,
      newValue: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    return successResponse(res, userObj, `User ${newUser.name} added successfully.`, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Admin only)
const updateUserRole = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findOne({ _id: req.params.id, pharmacy: req.pharmacyId });

    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    const oldRole = user.role;
    if (role && ['admin', 'pharmacist', 'staff'].includes(role)) {
      user.role = role;
    }
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_ROLE_CHANGED',
      entity: 'User',
      entityId: user._id,
      description: `Updated role for ${user.name} from ${oldRole} to ${user.role}`,
      oldValue: { role: oldRole },
      newValue: { role: user.role, isActive: user.isActive },
    });

    return successResponse(res, user, 'User updated successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUserRole,
};
