const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Pharmacist name is required.' });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }
  next();
};

const validateMedicine = (req, res, next) => {
  const { name, genericName, category } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Medicine name is required.' });
  }
  if (!genericName || !genericName.trim()) {
    return res.status(400).json({ success: false, message: 'Generic / Salt name is required.' });
  }
  if (!category || !category.trim()) {
    return res.status(400).json({ success: false, message: 'Category is required.' });
  }
  next();
};

const validateBatch = (req, res, next) => {
  const { batchNumber, quantity, purchasePrice, sellingPrice, expiryDate, manufacturingDate } = req.body;
  if (!batchNumber || !batchNumber.trim()) {
    return res.status(400).json({ success: false, message: 'Batch number is required.' });
  }
  if (quantity === undefined || Number(quantity) < 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be a non-negative number.' });
  }
  if (!expiryDate) {
    return res.status(400).json({ success: false, message: 'Expiry date is required.' });
  }
  if (manufacturingDate && new Date(expiryDate) <= new Date(manufacturingDate)) {
    return res.status(400).json({
      success: false,
      message: 'Expiry date cannot be earlier than or equal to manufacturing date.',
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateMedicine,
  validateBatch,
};
