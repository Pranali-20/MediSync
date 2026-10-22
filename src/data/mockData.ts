import { Medicine, Supplier, Bill, AIInsight, NotificationItem, PharmacySettings, UserProfile } from '../types';

export const INITIAL_SETTINGS: PharmacySettings = {
  pharmacyName: 'Apollo Care Pharmacy',
  pharmacyType: 'retail',
  tagline: 'Smarter Inventory. Safer Operations. Better Pharmacy Management.',
  licenseNumber: 'DL-KA-2024-88492',
  gstin: '29ABCDE1234F1Z5',
  address: 'Plot 42, Green Glen Layout, Bellandur, Bengaluru - 560103',
  phone: '+91 98765 43210',
  email: 'contact@apollocarepharma.com',
  currency: '₹',
  defaultTaxRate: 12,
  lowStockThresholdDefault: 20,
  nearExpiryDaysThreshold: 90,
  fefoEnabled: true,
  soundAlerts: true,
};

export const INITIAL_USER: UserProfile = {
  id: 'usr-1',
  name: 'Dr. Rajesh Sharma',
  email: 'rajesh.sharma@pharmaflow.ai',
  phone: '+91 98450 11223',
  role: 'Chief Pharmacist & Store Manager',
  pharmacyName: 'Apollo Care Pharmacy',
  pharmacyType: 'retail',
  address: 'Plot 42, Green Glen Layout, Bellandur, Bengaluru - 560103',
  licenseNumber: 'PH-REG-KA-99381',
  gstNumber: '29ABCDE1234F1Z5',
  shiftHours: '08:00 AM - 04:00 PM (Morning Shift)',
  hasCompletedOnboarding: true,
  avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=250&auto=format&fit=crop',
};

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Sun Pharma Distributors',
    company: 'Sun Pharmaceutical Industries Ltd.',
    phone: '+91 98200 44551',
    email: 'orders@sunpharmadist.in',
    address: 'Andheri East, Mumbai, Maharashtra 400069',
    gstNumber: '27AABCS1429B1ZX',
    medicinesSupplied: ['Pantoprazole 40mg', 'Atorvastatin 10mg', 'Metformin 500mg'],
    rating: 4.8,
    leadTimeDays: 2,
    totalOrders: 48,
  },
  {
    id: 'sup-2',
    name: 'Cipla Direct Healthcare',
    company: 'Cipla Medpro Logistics',
    phone: '+91 99100 88223',
    email: 'supply@ciplacare.com',
    address: 'Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    gstNumber: '27AAACC1234P1Z8',
    medicinesSupplied: ['Montelukast 10mg', 'Cetirizine 10mg', 'Azithromycin 500mg'],
    rating: 4.9,
    leadTimeDays: 1,
    totalOrders: 64,
  },
  {
    id: 'sup-3',
    name: 'Reddy Labs Regional Supply',
    company: "Dr. Reddy's Laboratories",
    phone: '+91 97000 66332',
    email: 'orders@drreddysdist.com',
    address: 'Banjara Hills, Hyderabad, Telangana 500034',
    gstNumber: '36AABCD7890Q1Z3',
    medicinesSupplied: ['Paracetamol 500mg', 'Ibuprofen 400mg', 'Ciprofloxacin 500mg'],
    rating: 4.6,
    leadTimeDays: 3,
    totalOrders: 37,
  },
];

export const INITIAL_MEDICINES: Medicine[] = [
  {
    id: 'med-1',
    name: 'Paracetamol 500mg',
    genericName: 'Acetaminophen / Paracetamol',
    category: 'Analgesics & Antipyretics',
    manufacturer: "Dr. Reddy's Laboratories",
    dosageForm: 'Tablet',
    strength: '500mg',
    minStockAlert: 30,
    reorderQuantity: 100,
    totalStock: 18,
    unitPrice: 20.0,
    purchasePrice: 12.0,
    location: 'Rack A - Shelf 2',
    requiresPrescription: false,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-09-18T15:30:00Z',
    batches: [
      {
        id: 'bat-101',
        batchNumber: 'PCM-26A01',
        medicineId: 'med-1',
        medicineName: 'Paracetamol 500mg',
        manufacturingDate: '2025-10-01',
        expiryDate: '2026-10-15',
        quantity: 8,
        initialQuantity: 100,
        purchasePrice: 12.0,
        mrp: 20.0,
        supplierId: 'sup-3',
        supplierName: 'Reddy Labs Regional Supply',
        barcode: '890108801122',
        status: 'Near Expiry',
      },
    ],
  },
];

export const INITIAL_BILLS: Bill[] = [];
export const INITIAL_AI_INSIGHTS: AIInsight[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const SALES_TREND_DATA = {
  '7days': [
    { label: 'Mon', sales: 24500, orders: 38, profit: 7800 },
    { label: 'Tue', sales: 28900, orders: 42, profit: 9200 },
    { label: 'Wed', sales: 31200, orders: 49, profit: 10400 },
    { label: 'Thu', sales: 27400, orders: 41, profit: 8900 },
    { label: 'Fri', sales: 35600, orders: 56, profit: 11800 },
    { label: 'Sat', sales: 41800, orders: 68, profit: 14200 },
    { label: 'Sun', sales: 32450, orders: 51, profit: 10600 },
  ],
  '30days': [
    { label: 'Week 1', sales: 185000, orders: 290, profit: 59000 },
    { label: 'Week 2', sales: 210000, orders: 330, profit: 68500 },
    { label: 'Week 3', sales: 198000, orders: 315, profit: 64200 },
    { label: 'Week 4', sales: 221850, orders: 345, profit: 72900 },
  ],
  '3months': [
    { label: 'July 2026', sales: 840000, orders: 1320, profit: 275000 },
    { label: 'August 2026', sales: 915000, orders: 1450, profit: 302000 },
    { label: 'September (MTD)', sales: 614850, orders: 980, profit: 201600 },
  ],
};
