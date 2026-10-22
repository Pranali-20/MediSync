const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const auditService = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// @desc    Get all suppliers with live performance metrics
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({ pharmacy: req.pharmacyId }).sort({ name: 1 });

    // Compute live performance metrics from actual Purchase Orders
    const suppliersWithMetrics = await Promise.all(
      suppliers.map(async (s) => {
        const orders = await PurchaseOrder.find({
          pharmacy: req.pharmacyId,
          supplier: s._id,
        });

        const totalOrders = orders.length;
        const completedOrders = orders.filter((o) => o.status === 'RECEIVED').length;
        const pendingOrders = orders.filter((o) => ['ORDERED', 'PARTIALLY_RECEIVED'].includes(o.status)).length;
        const totalPurchasedAmount = orders
          .filter((o) => o.status === 'RECEIVED')
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const sObj = s.toObject();
        sObj.totalOrders = totalOrders;
        sObj.completedOrders = completedOrders;
        sObj.pendingOrders = pendingOrders;
        sObj.totalPurchasedAmount = Number(totalPurchasedAmount.toFixed(2));
        sObj.fulfillmentRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 100;

        return sObj;
      })
    );

    return successResponse(res, suppliersWithMetrics);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single supplier with detailed price history & PO list
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!supplier) {
      return errorResponse(res, 'Supplier not found.', 404);
    }

    const orders = await PurchaseOrder.find({
      pharmacy: req.pharmacyId,
      supplier: supplier._id,
    }).sort({ createdAt: -1 });

    const sObj = supplier.toObject();
    sObj.recentOrders = orders;

    return successResponse(res, sObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new supplier
// @route   POST /api/suppliers
// @access  Private
const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, gstNumber, paymentTerms, leadTimeDays } = req.body;

    if (!name || !phone) {
      return errorResponse(res, 'Supplier name and contact phone are required.', 400);
    }

    const supplier = await Supplier.create({
      pharmacy: req.pharmacyId,
      name: name.trim(),
      contactPerson: contactPerson ? contactPerson.trim() : '',
      email: email ? email.toLowerCase().trim() : '',
      phone: phone.trim(),
      address: address ? address.trim() : '',
      gstNumber: gstNumber ? gstNumber.trim() : '',
      paymentTerms: paymentTerms || 'Net 30 Days',
      leadTimeDays: Number(leadTimeDays) || 3,
    });

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPPLIER_CREATED',
      entity: 'Supplier',
      entityId: supplier._id,
      description: `Registered new supplier: ${supplier.name}`,
    });

    return successResponse(res, supplier, 'Supplier created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!supplier) {
      return errorResponse(res, 'Supplier not found.', 404);
    }

    const allowed = ['name', 'contactPerson', 'email', 'phone', 'address', 'gstNumber', 'paymentTerms', 'leadTimeDays', 'status', 'rating'];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) supplier[k] = req.body[k];
    });

    await supplier.save();

    return successResponse(res, supplier, 'Supplier updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      pharmacy: req.pharmacyId,
    });

    if (!supplier) {
      return errorResponse(res, 'Supplier not found.', 404);
    }

    await Supplier.deleteOne({ _id: supplier._id });

    await auditService.log({
      pharmacyId: req.pharmacyId,
      userId: req.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUPPLIER_DELETED',
      entity: 'Supplier',
      entityId: supplier._id,
      description: `Deleted supplier: ${supplier.name}`,
    });

    return successResponse(res, { id: supplier._id }, 'Supplier deleted.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
