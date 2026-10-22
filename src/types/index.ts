export type StockStatus = 'Healthy' | 'Low' | 'Critical' | 'Out of Stock';
export type ExpiryStatus = 'Normal' | 'Monitor' | 'Near Expiry' | 'Expired';
export type PharmacyType = 'hospital' | 'retail' | 'hybrid';
export type UserRole = 'admin' | 'pharmacist' | 'staff';

export interface Batch {
  _id?: string;
  id?: string;
  batchNumber: string;
  medicine?: string | Medicine;
  medicineId?: string;
  medicineName?: string;
  manufacturingDate?: string;
  expiryDate: string;
  quantity: number;
  initialQuantity?: number;
  reservedQuantity?: number;
  damagedQuantity?: number;
  usableStock?: number;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  supplier?: any;
  supplierId?: string;
  supplierName?: string;
  barcode?: string;
  minimumStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  status?: ExpiryStatus;
  daysRemaining?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Medicine {
  _id?: string;
  id?: string;
  name: string;
  genericName: string;
  brand?: string;
  category: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  unit?: string;
  minStockAlert: number;
  reorderQuantity: number;
  totalStock: number;
  usableStock?: number;
  reservedStock?: number;
  damagedStock?: number;
  expiredStock?: number;
  stockStatus?: string;
  unitPrice?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  location: string;
  prescriptionRequired?: boolean;
  requiresPrescription?: boolean;
  barcode?: string;
  description?: string;
  batches: Batch[];
  activeBatchesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierPriceHistoryItem {
  medicine: string;
  medicineName: string;
  batchNumber?: string;
  price: number;
  date: string;
  invoiceNumber?: string;
}

export interface Supplier {
  _id?: string;
  id?: string;
  name: string;
  contactPerson?: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  paymentTerms?: string;
  medicinesSupplied?: string[];
  rating: number;
  leadTimeDays: number;
  totalOrders: number;
  completedOrders?: number;
  pendingOrders?: number;
  totalPurchasedAmount?: number;
  fulfillmentRate?: number;
  priceHistory?: SupplierPriceHistoryItem[];
  status?: 'Active' | 'Inactive';
  lastPurchaseDate?: string;
  createdAt?: string;
}

export interface PurchaseOrderItem {
  medicine: string | Medicine;
  medicineName: string;
  genericName?: string;
  quantityOrdered: number;
  quantityReceived?: number;
  unitPrice: number;
  subtotal: number;
  expectedBatchNumber?: string;
  status?: 'PENDING' | 'PARTIALLY_RECEIVED' | 'RECEIVED';
}

export interface ReceivedLotItem {
  medicine: string;
  medicineName: string;
  batch?: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  manufacturingDate?: string;
  expiryDate: string;
}

export interface ReceivingRecord {
  receivedAt: string;
  receivedBy?: string;
  receivedByName: string;
  invoiceReference?: string;
  items: ReceivedLotItem[];
  notes?: string;
}

export interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplier: string | Supplier;
  supplierName: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  totalAmount: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  receivedHistory?: ReceivingRecord[];
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleReturnItem {
  medicine: string;
  medicineName: string;
  batch: string;
  batchNumber: string;
  quantity: number;
  refundAmount: number;
  condition: 'SELLABLE' | 'DAMAGED' | 'EXPIRED' | 'NON_RESELLABLE';
  reason?: string;
}

export interface SaleReturnRecord {
  returnDate: string;
  items: SaleReturnItem[];
  refundTotal: number;
  reason?: string;
  processedBy?: string;
  processedByName?: string;
}

export interface BillItem {
  _id?: string;
  medicine?: string | Medicine;
  medicineId?: string;
  medicineName: string;
  genericName?: string;
  batch?: string | Batch;
  batchId?: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  quantityReturned?: number;
  unitPrice: number;
  taxPercent?: number;
  subtotal?: number;
  total?: number;
}

export interface Bill {
  _id?: string;
  id?: string;
  invoiceNumber: string;
  date?: string;
  createdAt?: string;
  customerName: string;
  customerPhone: string;
  doctorName?: string;
  items: BillItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Insurance';
  status?: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'CANCELLED';
  returns?: SaleReturnRecord[];
  pharmacistName: string;
}

export interface InventoryTransaction {
  _id: string;
  medicine: string | Medicine;
  medicineName: string;
  batch?: string | Batch;
  batchNumber?: string;
  type: 'PURCHASE' | 'SALE' | 'PRESCRIPTION_DISPENSING' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN' | 'DISPOSAL';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  createdBy?: any;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  user?: any;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface NotificationItem {
  _id?: string;
  id?: string;
  type: string;
  title: string;
  message: string;
  severity: 'danger' | 'warning' | 'info' | 'success';
  link?: string;
  read: boolean;
  createdAt?: string;
  timestamp?: string;
}

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';
export type InsightType = 'stockout_risk' | 'purchase_recommendation' | 'expiry_alert' | 'demand_forecast' | 'sales_velocity' | 'fefo_optimization';

export interface AIInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric?: string;
  medicineId?: string;
  batchId?: string;
  recommendedAction: string;
  actionType?: 'order' | 'discount' | 'review' | 'restock';
  estimatedImpact: string;
  date: string;
}

export interface AIRecommendation {
  medicineId: string;
  medicineName: string;
  genericName: string;
  category: string;
  dosageForm: string;
  usableStock: number;
  totalStock: number;
  dailyUsage: number;
  coverageDays: string;
  reorderPoint: number;
  recommendedReorderQty: number;
  supplierName: string;
  supplierLeadTimeDays: number;
  onOrderQuantity: number;
  priority: 'Critical' | 'High' | 'Medium';
  reasoning: string;
}

export interface SlowMovingItem {
  medicineId: string;
  medicineName: string;
  category: string;
  usableStock: number;
  unitValue: number;
  totalCapitalTied: number;
  daysWithoutMovement: number;
  suggestion: string;
}

export interface ExpiryRiskItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
  expectedUsageBeforeExpiry: number;
  excessUnitsAtRisk: number;
  estimatedValueAtRisk: number;
  suggestion: string;
}

export interface Patient {
  _id?: string;
  id?: string;
  patientId: string;
  name: string;
  phone: string;
  dateOfBirth?: string;
  age?: number;
  gender: 'Male' | 'Female' | 'Other' | 'Unspecified';
  hospitalId?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContact?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrescriptionItem {
  _id?: string;
  medicine: string | Medicine;
  medicineName: string;
  dosageInstructions: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  availableStock?: number;
  batches?: any[];
  availableBatches?: Array<{
    _id: string;
    batchNumber: string;
    quantity: number;
    usableStock?: number;
    expiryDate: string;
    sellingPrice: number;
  }>;
}

export interface DispensingRecord {
  dispensedAt: string;
  dispensedBy?: string;
  dispensedByName: string;
  items: Array<{
    medicine: string;
    medicineName: string;
    batch: string;
    batchNumber: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface Prescription {
  _id?: string;
  id?: string;
  prescriptionNumber: string;
  patient: string | Patient;
  patientName: string;
  doctorName: string;
  department: string;
  prescriptionDate: string;
  status: 'PENDING' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'CANCELLED';
  items: PrescriptionItem[];
  notes?: string;
  dispensedBy?: string;
  dispensedByName?: string;
  dispensedAt?: string;
  dispensingHistory?: DispensingRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserMember {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  licenseNumber?: string;
  shiftHours?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PharmacyProfile {
  _id?: string;
  id?: string;
  name: string;
  type: PharmacyType;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  licenseNumber?: string;
  tagline?: string;
  currency?: string;
  defaultTaxRate?: number;
  lowStockThresholdDefault?: number;
  nearExpiryDaysThreshold?: number;
  fefoEnabled?: boolean;
  soundAlerts?: boolean;
}

export interface UserProfile {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  pharmacyName: string;
  pharmacyType: PharmacyType;
  pharmacy?: PharmacyProfile;
  address: string;
  licenseNumber: string;
  gstNumber?: string;
  shiftHours?: string;
  hasCompletedOnboarding: boolean;
  avatarUrl?: string;
}

export interface PharmacySettings {
  pharmacyName: string;
  pharmacyType: PharmacyType;
  tagline: string;
  licenseNumber: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  defaultTaxRate: number;
  lowStockThresholdDefault: number;
  nearExpiryDaysThreshold: number;
  fefoEnabled: boolean;
  soundAlerts: boolean;
}
