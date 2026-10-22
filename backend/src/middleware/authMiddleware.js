const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pharmaflow_default_secret_key');

      const user = await User.findById(decoded.id).select('-password').populate('pharmacy');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists.',
        });
      }

      req.user = user;
      req.userId = user._id;
      req.pharmacy = user.pharmacy;
      req.pharmacyId = user.pharmacy ? user.pharmacy._id : null;
      req.pharmacyType = user.pharmacy ? user.pharmacy.type : 'retail';

      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token is invalid or expired.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }
};

const requirePharmacy = (req, res, next) => {
  if (!req.pharmacyId) {
    return res.status(403).json({
      success: false,
      message: 'Pharmacy profile required. Please complete pharmacy setup first.',
    });
  }
  next();
};

const requireHospitalOrHybrid = (req, res, next) => {
  if (!req.pharmacyId) {
    return res.status(403).json({
      success: false,
      message: 'Pharmacy profile required.',
    });
  }

  const type = req.pharmacy?.type;
  if (type !== 'hospital' && type !== 'hybrid') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This module is only available for Hospital-Attached and Hybrid pharmacies.',
    });
  }
  next();
};

module.exports = { protect, requirePharmacy, requireHospitalOrHybrid };
