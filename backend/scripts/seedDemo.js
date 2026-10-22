const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');
const Pharmacy = require('../src/models/Pharmacy');
const Medicine = require('../src/models/Medicine');
const Batch = require('../src/models/Batch');
const Supplier = require('../src/models/Supplier');
const Sale = require('../src/models/Sale');
const Patient = require('../src/models/Patient');
const Prescription = require('../src/models/Prescription');
const InventoryTransaction = require('../src/models/InventoryTransaction');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const AuditLog = require('../src/models/AuditLog');

dotenv.config();

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmaflow';
    await mongoose.connect(mongoUri);
    console.log('[Seed Script] Connected to MongoDB.');

    // Clear existing collections to ensure clean seed
    await Promise.all([
      User.deleteMany({}),
      Pharmacy.deleteMany({}),
      Medicine.deleteMany({}),
      Batch.deleteMany({}),
      Supplier.deleteMany({}),
      Sale.deleteMany({}),
      Patient.deleteMany({}),
      Prescription.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('🧹 Cleaned existing database collections.');

    // ==========================================
    // 1. HOSPITAL PHARMACY SEED (hospital@medisync.ai)
    // ==========================================
    const hospitalUser = await User.create({
      name: 'Dr. Ananya Roy',
      email: 'hospital@medisync.ai',
      phone: '+91 98111 22334',
      password: 'password123',
      role: 'admin',
      licenseNumber: 'HOSP-PHARM-8891',
    });

    const hospitalPharmacy = await Pharmacy.create({
      name: 'Apex City Hospital Pharmacy',
      type: 'hospital',
      owner: hospitalUser._id,
      phone: '+91 98111 22334',
      email: 'hospital@medisync.ai',
      address: 'Wing B, Ground Floor, Apex Multi-Specialty Hospital, Mumbai',
      licenseNumber: 'HOSP-PHARM-8891',
      gstNumber: '27AABCA1122D1Z4',
    });
    hospitalUser.pharmacy = hospitalPharmacy._id;
    await hospitalUser.save();

    const hospSupplier = await Supplier.create({
      pharmacy: hospitalPharmacy._id,
      name: 'Cipla Institutional Supplies',
      contactPerson: 'Arun Verma',
      phone: '+91 98220 33441',
      email: 'inst-sales@cipla.com',
      address: 'Pharma Hub, Sector 4, Navi Mumbai',
      leadTimeDays: 2,
      rating: 4.8,
      totalOrders: 3,
      completedOrders: 2,
      totalPurchasedAmount: 45000,
    });

    // Hospital Medicines & Multiple Batches
    const ceftriaxone = await Medicine.create({
      pharmacy: hospitalPharmacy._id,
      name: 'Ceftriaxone 1g Injection',
      genericName: 'Ceftriaxone Sodium',
      brand: 'Monocef 1g',
      category: 'Antibiotics & Injectables',
      manufacturer: 'Aristo Pharmaceuticals',
      dosageForm: 'Injection',
      strength: '1g',
      unit: 'Vial',
      minStockAlert: 30,
      reorderQuantity: 100,
      totalStock: 165,
      purchasePrice: 45,
      sellingPrice: 70,
      location: 'Cold Storage - Rack A',
      prescriptionRequired: true,
      barcode: '890123411001',
    });

    // Batch 1 (Expires Jan 2027 - Prioritized in FEFO)
    const ctxBatch1 = await Batch.create({
      pharmacy: hospitalPharmacy._id,
      medicine: ceftriaxone._id,
      batchNumber: 'CTX-26A40',
      quantity: 65,
      initialQuantity: 100,
      purchasePrice: 45,
      sellingPrice: 70,
      manufacturingDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-01-15'),
      supplier: hospSupplier._id,
      supplierName: hospSupplier.name,
      barcode: '890123411001',
    });

    // Batch 2 (Expires Nov 2027)
    const ctxBatch2 = await Batch.create({
      pharmacy: hospitalPharmacy._id,
      medicine: ceftriaxone._id,
      batchNumber: 'CTX-26E92',
      quantity: 100,
      initialQuantity: 100,
      purchasePrice: 46,
      sellingPrice: 72,
      manufacturingDate: new Date('2026-03-10'),
      expiryDate: new Date('2027-11-20'),
      supplier: hospSupplier._id,
      supplierName: hospSupplier.name,
      barcode: '890123411001',
    });

    const pantoprazole = await Medicine.create({
      pharmacy: hospitalPharmacy._id,
      name: 'Pantoprazole 40mg IV',
      genericName: 'Pantoprazole Sodium',
      brand: 'Pan 40 IV',
      category: 'Gastrointestinal',
      manufacturer: 'Alkem Laboratories',
      dosageForm: 'Injection',
      strength: '40mg',
      unit: 'Vial',
      minStockAlert: 30,
      reorderQuantity: 80,
      totalStock: 50,
      purchasePrice: 32,
      sellingPrice: 55,
      location: 'Ward Supply Rack 2',
      prescriptionRequired: true,
      barcode: '890123422002',
    });

    await Batch.create({
      pharmacy: hospitalPharmacy._id,
      medicine: pantoprazole._id,
      batchNumber: 'PAN-26C11',
      quantity: 50,
      initialQuantity: 100,
      purchasePrice: 32,
      sellingPrice: 55,
      manufacturingDate: new Date('2026-02-10'),
      expiryDate: new Date('2027-10-15'),
      supplier: hospSupplier._id,
      supplierName: hospSupplier.name,
      barcode: '890123422002',
    });

    // Hospital Patients
    const patient1 = await Patient.create({
      pharmacy: hospitalPharmacy._id,
      patientId: 'PAT-1001',
      name: 'Rahul Deshmukh',
      phone: '+91 97654 32100',
      age: 42,
      gender: 'Male',
      hospitalId: 'UHID-2026-8812 (Ward 304, Bed 2)',
      bloodGroup: 'B+',
      allergies: ['Penicillin'],
      address: 'Dadar West, Mumbai',
    });

    const patient2 = await Patient.create({
      pharmacy: hospitalPharmacy._id,
      patientId: 'PAT-1002',
      name: 'Meena Kulkarni',
      phone: '+91 98765 43211',
      age: 63,
      gender: 'Female',
      hospitalId: 'UHID-2026-8845 (ICU Bed 4)',
      bloodGroup: 'O+',
      allergies: [],
      address: 'Andheri East, Mumbai',
    });

    // Hospital Prescriptions
    await Prescription.create({
      pharmacy: hospitalPharmacy._id,
      prescriptionNumber: 'RX-2026-0101',
      patient: patient1._id,
      patientName: patient1.name,
      doctorName: 'Dr. Suresh Mehta, MD',
      department: 'General Medicine',
      status: 'PENDING',
      notes: 'Post-operative recovery course',
      items: [
        {
          medicine: ceftriaxone._id,
          medicineName: ceftriaxone.name,
          dosageInstructions: '1 vial IV twice daily after food test for 3 days',
          quantityPrescribed: 6,
          quantityDispensed: 0,
        },
        {
          medicine: pantoprazole._id,
          medicineName: pantoprazole.name,
          dosageInstructions: '1 vial IV every morning before breakfast',
          quantityPrescribed: 3,
          quantityDispensed: 0,
        },
      ],
    });

    // Hospital Purchase Order
    await PurchaseOrder.create({
      pharmacy: hospitalPharmacy._id,
      orderNumber: 'PO-2026-0001',
      supplier: hospSupplier._id,
      supplierName: hospSupplier.name,
      status: 'ORDERED',
      totalAmount: 9000,
      expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      items: [
        {
          medicine: ceftriaxone._id,
          medicineName: ceftriaxone.name,
          quantityOrdered: 200,
          quantityReceived: 0,
          unitPrice: 45,
          subtotal: 9000,
          status: 'PENDING',
        },
      ],
      createdBy: hospitalUser._id,
      createdByName: hospitalUser.name,
    });

    console.log('✅ Created Hospital Pharmacy Account: hospital@medisync.ai / password123');

    // ==========================================
    // 2. RETAIL PHARMACY SEED (retail@medisync.ai)
    // ==========================================
    const retailUser = await User.create({
      name: 'Dr. Rajesh Sharma',
      email: 'retail@medisync.ai',
      phone: '+91 98450 11223',
      password: 'password123',
      role: 'admin',
      licenseNumber: 'MH-RET-2024-998',
    });

    const retailPharmacy = await Pharmacy.create({
      name: 'Green Cross Community Pharmacy',
      type: 'retail',
      owner: retailUser._id,
      phone: '+91 98450 11223',
      email: 'retail@medisync.ai',
      address: 'Shop 4, Sunrise Plaza, MG Road, Pune',
      licenseNumber: 'MH-RET-2024-998',
      gstNumber: '27AABCS5566K1Z9',
    });
    retailUser.pharmacy = retailPharmacy._id;
    await retailUser.save();

    const retailSupplier = await Supplier.create({
      pharmacy: retailPharmacy._id,
      name: 'Reddy Labs Regional Distributors',
      contactPerson: 'Deepak Patel',
      phone: '+91 98765 43210',
      email: 'supply@reddylabs.com',
      address: 'MIDC Phase 2, Pune',
      leadTimeDays: 1,
      rating: 4.9,
      totalOrders: 5,
      completedOrders: 4,
      totalPurchasedAmount: 85000,
      priceHistory: [
        {
          medicine: new mongoose.Types.ObjectId(),
          medicineName: 'Paracetamol 650mg',
          batchNumber: 'DLO-25J12',
          price: 17.5,
          date: new Date('2025-10-15'),
          invoiceNumber: 'INV-SPL-8812',
        },
        {
          medicine: new mongoose.Types.ObjectId(),
          medicineName: 'Paracetamol 650mg',
          batchNumber: 'DLO-26A01',
          price: 18.0,
          date: new Date('2026-01-10'),
          invoiceNumber: 'INV-SPL-9045',
        },
      ],
    });

    // Retail Medicine 1: Paracetamol with 2 active batches (demonstrating FEFO)
    const paracetamol = await Medicine.create({
      pharmacy: retailPharmacy._id,
      name: 'Paracetamol 650mg',
      genericName: 'Paracetamol / Acetaminophen',
      brand: 'Dolo 650',
      category: 'Analgesics & Antipyretics',
      manufacturer: 'Micro Labs Ltd.',
      dosageForm: 'Tablet',
      strength: '650mg',
      unit: 'Strip of 15',
      minStockAlert: 30,
      reorderQuantity: 100,
      totalStock: 185,
      purchasePrice: 18,
      sellingPrice: 32,
      location: 'Rack A - Shelf 1',
      prescriptionRequired: false,
      barcode: '890108801122',
    });

    // Batch 1 (Expires soonest: Dec 2026 -> FEFO candidate)
    const pcmBatch1 = await Batch.create({
      pharmacy: retailPharmacy._id,
      medicine: paracetamol._id,
      batchNumber: 'DLO-26A01',
      quantity: 85,
      initialQuantity: 150,
      purchasePrice: 18,
      sellingPrice: 32,
      manufacturingDate: new Date('2026-01-10'),
      expiryDate: new Date('2026-12-30'),
      supplier: retailSupplier._id,
      supplierName: retailSupplier.name,
      barcode: '890108801122',
    });

    // Batch 2 (Expires later: Aug 2028)
    const pcmBatch2 = await Batch.create({
      pharmacy: retailPharmacy._id,
      medicine: paracetamol._id,
      batchNumber: 'DLO-26C44',
      quantity: 100,
      initialQuantity: 100,
      purchasePrice: 18.5,
      sellingPrice: 32,
      manufacturingDate: new Date('2026-03-01'),
      expiryDate: new Date('2028-08-15'),
      supplier: retailSupplier._id,
      supplierName: retailSupplier.name,
      barcode: '890108801122',
    });

    // Retail Medicine 2: Cetirizine
    const cetirizine = await Medicine.create({
      pharmacy: retailPharmacy._id,
      name: 'Cetirizine 10mg',
      genericName: 'Cetirizine HCl',
      brand: 'Cetzine',
      category: 'Antihistamines',
      manufacturer: 'Cipla Ltd.',
      dosageForm: 'Tablet',
      strength: '10mg',
      unit: 'Strip of 10',
      minStockAlert: 20,
      reorderQuantity: 50,
      totalStock: 40,
      purchasePrice: 22,
      sellingPrice: 38,
      location: 'Rack B - Shelf 3',
      prescriptionRequired: false,
      barcode: '890315509812',
    });

    await Batch.create({
      pharmacy: retailPharmacy._id,
      medicine: cetirizine._id,
      batchNumber: 'CTZ-26D04',
      quantity: 40,
      initialQuantity: 100,
      purchasePrice: 22,
      sellingPrice: 38,
      manufacturingDate: new Date('2026-02-01'),
      expiryDate: new Date('2027-11-20'),
      supplier: retailSupplier._id,
      supplierName: retailSupplier.name,
      barcode: '890315509812',
    });

    // Retail Sale
    await Sale.create({
      pharmacy: retailPharmacy._id,
      invoiceNumber: 'INV-2026-0001',
      customerName: 'Amit Patel',
      customerPhone: '+91 98223 44556',
      items: [
        {
          medicine: paracetamol._id,
          medicineName: paracetamol.name,
          genericName: paracetamol.genericName,
          batch: pcmBatch1._id,
          batchNumber: pcmBatch1.batchNumber,
          quantity: 2,
          unitPrice: 32,
          taxPercent: 12,
          subtotal: 64,
        },
      ],
      subtotal: 64,
      taxAmount: 7.68,
      totalAmount: 71.68,
      paymentMethod: 'UPI',
      status: 'COMPLETED',
      createdBy: retailUser._id,
      pharmacistName: retailUser.name,
    });

    // Retail Purchase Order
    await PurchaseOrder.create({
      pharmacy: retailPharmacy._id,
      orderNumber: 'PO-2026-0001',
      supplier: retailSupplier._id,
      supplierName: retailSupplier.name,
      status: 'ORDERED',
      totalAmount: 3600,
      expectedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      items: [
        {
          medicine: paracetamol._id,
          medicineName: paracetamol.name,
          quantityOrdered: 200,
          quantityReceived: 0,
          unitPrice: 18,
          subtotal: 3600,
          status: 'PENDING',
        },
      ],
      createdBy: retailUser._id,
      createdByName: retailUser.name,
    });

    console.log('✅ Created Retail Pharmacy Account: retail@medisync.ai / password123');

    // ==========================================
    // 3. HYBRID PHARMACY SEED (hybrid@medisync.ai)
    // ==========================================
    const hybridUser = await User.create({
      name: 'Dr. Vikram Seth',
      email: 'hybrid@medisync.ai',
      phone: '+91 98333 44556',
      password: 'password123',
      role: 'admin',
      licenseNumber: 'HYB-PHARM-4402',
    });

    const hybridPharmacy = await Pharmacy.create({
      name: 'Metro Health Care & Retail Pharmacy',
      type: 'hybrid',
      owner: hybridUser._id,
      phone: '+91 98333 44556',
      email: 'hybrid@medisync.ai',
      address: 'Main Concourse, Metro Medical Centre, Bengaluru',
      licenseNumber: 'HYB-PHARM-4402',
      gstNumber: '29AABCS7788J1Z1',
    });
    hybridUser.pharmacy = hybridPharmacy._id;
    await hybridUser.save();

    const hybridSupplier = await Supplier.create({
      pharmacy: hybridPharmacy._id,
      name: 'Sun Pharma Direct Distribution',
      contactPerson: 'Sunil Rao',
      phone: '+91 98440 55667',
      email: 'orders@sunpharma.com',
      address: 'Whitefield Industrial Area, Bengaluru',
      leadTimeDays: 2,
      rating: 4.9,
      totalOrders: 4,
      completedOrders: 3,
      totalPurchasedAmount: 52000,
    });

    const azithro = await Medicine.create({
      pharmacy: hybridPharmacy._id,
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin Dihydrate',
      brand: 'Azee 500',
      category: 'Antibiotics',
      manufacturer: 'Cipla Ltd.',
      dosageForm: 'Tablet',
      strength: '500mg',
      unit: 'Strip of 5',
      minStockAlert: 20,
      reorderQuantity: 60,
      totalStock: 50,
      purchasePrice: 65,
      sellingPrice: 110,
      location: 'Rack C - Shelf 2',
      prescriptionRequired: true,
      barcode: '890123456789',
    });

    await Batch.create({
      pharmacy: hybridPharmacy._id,
      medicine: azithro._id,
      batchNumber: 'AZ-26H09',
      quantity: 50,
      initialQuantity: 100,
      purchasePrice: 65,
      sellingPrice: 110,
      manufacturingDate: new Date('2026-01-15'),
      expiryDate: new Date('2027-12-31'),
      supplier: hybridSupplier._id,
      supplierName: hybridSupplier.name,
      barcode: '890123456789',
    });

    const hybridPatient = await Patient.create({
      pharmacy: hybridPharmacy._id,
      patientId: 'PAT-5001',
      name: 'Pooja Iyer',
      phone: '+91 99887 76655',
      age: 29,
      gender: 'Female',
      hospitalId: 'OPD-REG-4421',
      bloodGroup: 'A+',
      allergies: ['Sulfa drugs'],
      address: 'Indiranagar, Bengaluru',
    });

    await Prescription.create({
      pharmacy: hybridPharmacy._id,
      prescriptionNumber: 'RX-2026-5501',
      patient: hybridPatient._id,
      patientName: hybridPatient.name,
      doctorName: 'Dr. Ramesh Rao, MD (Pulmonology)',
      department: 'Pulmonology OPD',
      status: 'PENDING',
      notes: 'Upper respiratory infection course',
      items: [
        {
          medicine: azithro._id,
          medicineName: azithro.name,
          dosageInstructions: '1 tablet once daily after dinner for 5 days',
          quantityPrescribed: 5,
          quantityDispensed: 0,
        },
      ],
    });

    console.log('✅ Created Hybrid Pharmacy Account: hybrid@medisync.ai / password123');
    console.log('\n🎉 All 3 Demo Test Accounts Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
