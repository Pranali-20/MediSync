const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get profile details
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate('pharmacy');
    if (!user) return errorResponse(res, 'User not found.', 404);

    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        licenseNumber: user.licenseNumber,
        shiftHours: user.shiftHours,
        avatarUrl: user.avatarUrl,
      },
      pharmacy: user.pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user and pharmacy profile
// @route   PUT /api/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, licenseNumber, shiftHours, pharmacyName, address, gstNumber } = req.body;

    // 1. Update User
    const user = await User.findById(req.userId);
    if (!user) return errorResponse(res, 'User not found.', 404);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (shiftHours) user.shiftHours = shiftHours;
    await user.save();

    // 2. Update Pharmacy
    let pharmacy = null;
    if (user.pharmacy) {
      pharmacy = await Pharmacy.findById(user.pharmacy);
      if (pharmacy) {
        if (pharmacyName) pharmacy.name = pharmacyName;
        if (phone) pharmacy.phone = phone;
        if (address !== undefined) pharmacy.address = address;
        if (gstNumber !== undefined) pharmacy.gstNumber = gstNumber;
        if (licenseNumber !== undefined) pharmacy.licenseNumber = licenseNumber;
        await pharmacy.save();
      }
    }

    return successResponse(res, { user, pharmacy }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Update password securely
// @route   PUT /api/profile/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long.', 400);
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) return errorResponse(res, 'User not found.', 404);

    if (!(await user.matchPassword(currentPassword))) {
      return errorResponse(res, 'Current password is incorrect.', 400);
    }

    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Get pharmacy settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findById(req.pharmacyId);
    if (!pharmacy) return errorResponse(res, 'Pharmacy not found.', 404);
    return successResponse(res, pharmacy);
  } catch (error) {
    next(error);
  }
};

// @desc    Update pharmacy settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findByIdAndUpdate(req.pharmacyId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!pharmacy) return errorResponse(res, 'Pharmacy not found.', 404);
    return successResponse(res, pharmacy, 'Settings updated successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  getSettings,
  updateSettings,
};
