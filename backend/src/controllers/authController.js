const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pharmaflow_default_secret_key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register a new Pharmacist & Pharmacy
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, pharmacyName, pharmacyType = 'retail', email, phone, password, address, gstNumber, licenseNumber } = req.body;

    // Validate pharmacy type
    const validTypes = ['hospital', 'retail', 'hybrid'];
    const normalizedType = validTypes.includes(pharmacyType?.toLowerCase())
      ? pharmacyType.toLowerCase()
      : 'retail';

    // Check duplicate email
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return errorResponse(res, 'User with this email already exists.', 400);
    }

    // 1. Create User
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      password,
      role: 'pharmacist',
      licenseNumber: licenseNumber || '',
    });

    // 2. Create Pharmacy associated with this user
    const pharmacy = await Pharmacy.create({
      name: pharmacyName || `${name}'s Pharmacy`,
      type: normalizedType,
      owner: user._id,
      phone: phone || '',
      email: email.toLowerCase(),
      address: address || '',
      gstNumber: gstNumber || '',
      licenseNumber: licenseNumber || '',
    });

    // 3. Link Pharmacy to User
    user.pharmacy = pharmacy._id;
    await user.save();

    const token = generateToken(user._id);

    return successResponse(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        pharmacy: {
          id: pharmacy._id,
          name: pharmacy.name,
          type: pharmacy.type,
          address: pharmacy.address,
          phone: pharmacy.phone,
          gstNumber: pharmacy.gstNumber,
          licenseNumber: pharmacy.licenseNumber,
        },
      },
      'Registration successful. Pharmacy workspace initialized.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Please provide both email and password.', 400);
    }

    // Find user with password included for verification
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('pharmacy');

    if (!user || !(await user.matchPassword(password))) {
      return errorResponse(res, 'Invalid email address or password.', 401);
    }

    const token = generateToken(user._id);

    return successResponse(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      pharmacy: user.pharmacy
        ? {
            id: user.pharmacy._id,
            name: user.pharmacy.name,
            type: user.pharmacy.type || 'retail',
            licenseNumber: user.pharmacy.licenseNumber || '',
            gstNumber: user.pharmacy.gstNumber || '',
            address: user.pharmacy.address || '',
            phone: user.pharmacy.phone || '',
          }
        : null,
    }, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

// @desc    Get authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate('pharmacy');
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    return successResponse(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      licenseNumber: user.licenseNumber,
      shiftHours: user.shiftHours,
      avatarUrl: user.avatarUrl,
      pharmacy: user.pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  return successResponse(res, null, 'Logged out successfully.');
};

// @desc    Forgot Password link dispatch
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return errorResponse(res, 'No user found with this email address.', 404);
    }
    return successResponse(res, null, 'Password reset instructions have been dispatched.');
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }
    user.password = newPassword;
    await user.save();
    return successResponse(res, null, 'Password reset successfully. You can now login.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
};
