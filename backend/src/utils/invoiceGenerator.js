const Sale = require('../models/Sale');

const generateInvoiceNumber = async (pharmacyId) => {
  const currentYear = new Date().getFullYear();
  const count = await Sale.countDocuments({ pharmacy: pharmacyId });
  const sequence = String(count + 1).padStart(5, '0');
  return `PF-${currentYear}-${sequence}`;
};

module.exports = { generateInvoiceNumber };
