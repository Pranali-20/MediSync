const Sale = require('../models/Sale');

const generateInvoiceNumber = async (_pharmacyId) => {
  const currentYear = new Date().getFullYear();
  const prefix = `MS-${currentYear}`;

  // Find all existing sales across the entire database to find the highest sequence number
  const sales = await Sale.find({
    invoiceNumber: { $regex: new RegExp(`(?:MS|PF|INV)-${currentYear}-(\\d+)`, 'i') },
  }).select('invoiceNumber').lean();

  let maxSeq = 0;
  for (const s of sales) {
    if (!s.invoiceNumber) continue;
    const match = s.invoiceNumber.match(/-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  // Use global total sales count as an additional baseline
  const totalGlobalSales = await Sale.countDocuments();
  let nextSeq = Math.max(maxSeq, totalGlobalSales) + 1;

  let candidate = `${prefix}-${String(nextSeq).padStart(5, '0')}`;

  // Ensure absolute uniqueness across the entire database
  while (await Sale.exists({ invoiceNumber: candidate })) {
    nextSeq += 1;
    candidate = `${prefix}-${String(nextSeq).padStart(5, '0')}`;
  }

  return candidate;
};

module.exports = { generateInvoiceNumber };

