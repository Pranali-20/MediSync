const AuditLog = require('../models/AuditLog');

const auditService = {
  log: async ({
    pharmacyId,
    userId = null,
    userName = 'System',
    userRole = 'pharmacist',
    action,
    entity,
    entityId = '',
    description,
    oldValue = null,
    newValue = null,
    ipAddress = '',
  }) => {
    try {
      if (!pharmacyId || !action || !entity || !description) {
        console.warn('[AuditService] Missing required audit fields');
        return null;
      }

      const logEntry = await AuditLog.create({
        pharmacy: pharmacyId,
        user: userId,
        userName,
        userRole,
        action,
        entity,
        entityId: String(entityId),
        description,
        oldValue,
        newValue,
        ipAddress,
      });

      return logEntry;
    } catch (err) {
      console.error('[AuditService Error]:', err.message);
      // Non-blocking: audit failure shouldn't crash the main transaction
      return null;
    }
  },
};

module.exports = auditService;
