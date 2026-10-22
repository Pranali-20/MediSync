const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get audit trail
// @route   GET /api/audit-logs
// @access  Private
const getAuditLogs = async (req, res, next) => {
  try {
    const { entity, action, page = 1, limit = 50 } = req.query;
    const query = { pharmacy: req.pharmacyId };

    if (entity && entity !== 'ALL') {
      query.entity = entity;
    }

    if (action && action !== 'ALL') {
      query.action = action;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name email role');

    return successResponse(res, {
      logs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
