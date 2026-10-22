const Pharmacy = require('../models/Pharmacy');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get pharmacy details
// @route   GET /api/pharmacy
// @access  Private
const getPharmacy = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findById(req.pharmacyId);
    if (!pharmacy) {
      return errorResponse(res, 'Pharmacy not found.', 404);
    }
    return successResponse(res, pharmacy);
  } catch (error) {
    next(error);
  }
};

// @desc    Update pharmacy details
// @route   PUT /api/pharmacy
// @access  Private
const updatePharmacy = async (req, res, next) => {
  try {
    const pharmacy = await Pharmacy.findById(req.pharmacyId);
    if (!pharmacy) {
      return errorResponse(res, 'Pharmacy not found.', 404);
    }

    const {
      name,
      phone,
      email,
      address,
      gstNumber,
      licenseNumber,
      tagline,
      currency,
      defaultTaxRate,
      lowStockThresholdDefault,
      nearExpiryDaysThreshold,
      fefoEnabled,
      soundAlerts,
    } = req.body;

    if (name !== undefined) pharmacy.name = name.trim();
    if (phone !== undefined) pharmacy.phone = phone.trim();
    if (email !== undefined) pharmacy.email = email.trim();
    if (address !== undefined) pharmacy.address = address.trim();
    if (gstNumber !== undefined) pharmacy.gstNumber = gstNumber.trim();
    if (licenseNumber !== undefined) pharmacy.licenseNumber = licenseNumber.trim();
    if (tagline !== undefined) pharmacy.tagline = tagline.trim();
    if (currency !== undefined) pharmacy.currency = currency;
    if (defaultTaxRate !== undefined) pharmacy.defaultTaxRate = Number(defaultTaxRate);
    if (lowStockThresholdDefault !== undefined) pharmacy.lowStockThresholdDefault = Number(lowStockThresholdDefault);
    if (nearExpiryDaysThreshold !== undefined) pharmacy.nearExpiryDaysThreshold = Number(nearExpiryDaysThreshold);
    if (fefoEnabled !== undefined) pharmacy.fefoEnabled = Boolean(fefoEnabled);
    if (soundAlerts !== undefined) pharmacy.soundAlerts = Boolean(soundAlerts);

    await pharmacy.save();

    return successResponse(res, pharmacy, 'Pharmacy settings updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Update pharmacy type (Hospital, Retail, Hybrid)
// @route   PUT /api/pharmacy/type
// @access  Private
const updatePharmacyType = async (req, res, next) => {
  try {
    const { type } = req.body;
    const validTypes = ['hospital', 'retail', 'hybrid'];

    if (!type || !validTypes.includes(type.toLowerCase())) {
      return errorResponse(res, 'Invalid pharmacy type. Must be hospital, retail, or hybrid.', 400);
    }

    const pharmacy = await Pharmacy.findById(req.pharmacyId);
    if (!pharmacy) {
      return errorResponse(res, 'Pharmacy not found.', 404);
    }

    pharmacy.type = type.toLowerCase();
    await pharmacy.save();

    return successResponse(
      res,
      pharmacy,
      'Pharmacy type updated to ' + pharmacy.type.toUpperCase() + '. Application workflow refreshed.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPharmacy,
  updatePharmacy,
  updatePharmacyType,
};
