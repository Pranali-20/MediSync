import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Medicine,
  Batch,
  Supplier,
  Bill,
  BillItem,
  AIInsight,
  NotificationItem,
  PharmacySettings,
  StockStatus,
  ExpiryStatus,
} from '../types';
import {
  DEMO_MEDICINES,
  DEMO_SUPPLIERS,
  DEMO_BILLS,
  DEMO_SETTINGS,
} from '../data/demoData';

const DEFAULT_CLEAN_SETTINGS: PharmacySettings = {
  pharmacyName: 'My Pharmacy',
  pharmacyType: 'retail',
  tagline: 'Smarter Inventory. Safer Operations. Better Pharmacy Management.',
  licenseNumber: '',
  gstin: '',
  address: '',
  phone: '',
  email: '',
  currency: '₹',
  defaultTaxRate: 12,
  lowStockThresholdDefault: 20,
  nearExpiryDaysThreshold: 90,
  fefoEnabled: true,
  soundAlerts: true,
};

interface AppContextType {
  medicines: Medicine[];
  suppliers: Supplier[];
  bills: Bill[];
  insights: AIInsight[];
  notifications: NotificationItem[];
  settings: PharmacySettings;
  hasData: boolean;

  // Medicine operations
  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'totalStock'> & { initialBatch?: Omit<Batch, 'id' | 'medicineId' | 'medicineName'> }) => Medicine;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  getMedicineById: (id: string) => Medicine | undefined;

  // Batch operations
  addBatch: (medicineId: string, batch: Omit<Batch, 'id' | 'medicineId' | 'medicineName'>) => void;
  updateBatchStock: (medicineId: string, batchId: string, newQuantity: number) => void;
  removeBatch: (medicineId: string, batchId: string) => void;

  // Supplier operations
  addSupplier: (supplier: Omit<Supplier, 'id' | 'totalOrders'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Billing operations
  createBill: (billData: Omit<Bill, 'id' | 'invoiceNumber' | 'date'>) => Bill;

  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;

  // Settings & Utilities
  updateSettings: (updates: Partial<PharmacySettings>) => void;
  loadDemoData: () => void;
  clearAllData: () => void;

  // Computed properties
  totalMedicinesCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  todaySalesTotal: number;
  allBatches: (Batch & { category: string; requiresPrescription: boolean })[];
  getStockStatus: (medicine: Medicine) => StockStatus;
  getBatchExpiryStatus: (expiryDateStr: string) => ExpiryStatus;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  MEDICINES: 'pharmaflow_v2_medicines',
  SUPPLIERS: 'pharmaflow_v2_suppliers',
  BILLS: 'pharmaflow_v2_bills',
  NOTIFICATIONS: 'pharmaflow_v2_notifications',
  SETTINGS: 'pharmaflow_v2_settings',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // STRICT RULE: Empty arrays initially for fresh accounts
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.MEDICINES);
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SUPPLIERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.BILLS);
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<PharmacySettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_CLEAN_SETTINGS;
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Expiry calculation helper
  const getBatchExpiryStatus = (expiryDateStr: string): ExpiryStatus => {
    if (!expiryDateStr) return 'Normal';
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays <= 30) return 'Near Expiry';
    if (diffDays <= 90) return 'Monitor';
    return 'Normal';
  };

  // Stock status calculation helper
  const getStockStatus = (medicine: Medicine): StockStatus => {
    if (medicine.totalStock === 0) return 'Out of Stock';
    if (medicine.totalStock <= medicine.minStockAlert * 0.4) return 'Critical';
    if (medicine.totalStock <= medicine.minStockAlert) return 'Low';
    return 'Healthy';
  };

  // Add Medicine
  const addMedicine = (
    data: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'totalStock'> & {
      initialBatch?: Omit<Batch, 'id' | 'medicineId' | 'medicineName'>;
    }
  ): Medicine => {
    const newMedId = `med-${Date.now()}`;
    const now = new Date().toISOString();

    let batches: Batch[] = [];
    let initialTotalStock = 0;

    if (data.initialBatch && data.initialBatch.quantity > 0) {
      const newBatch: Batch = {
        ...data.initialBatch,
        id: `bat-${Date.now()}`,
        medicineId: newMedId,
        medicineName: data.name,
        status: getBatchExpiryStatus(data.initialBatch.expiryDate),
      };
      batches = [newBatch];
      initialTotalStock = newBatch.quantity;
    }

    const newMedicine: Medicine = {
      ...data,
      id: newMedId,
      totalStock: initialTotalStock,
      batches,
      createdAt: now,
      updatedAt: now,
    };

    setMedicines((prev) => [newMedicine, ...prev]);

    // Create notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type: 'stock',
      title: `Medicine Added: ${newMedicine.name}`,
      message: `Initial stock of ${initialTotalStock} units registered.`,
      timestamp: 'Just now',
      read: false,
      link: `/medicines/${newMedId}`,
      severity: 'info',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newMedicine;
  };

  // Update Medicine
  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id !== id) return med;
        const updated = {
          ...med,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        if (updates.batches) {
          updated.totalStock = updates.batches.reduce((sum, b) => sum + b.quantity, 0);
        }
        return updated;
      })
    );
  };

  // Delete Medicine
  const deleteMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const getMedicineById = (id: string) => medicines.find((m) => m.id === id);

  // Add Batch
  const addBatch = (medicineId: string, batchData: Omit<Batch, 'id' | 'medicineId' | 'medicineName'>) => {
    const med = medicines.find((m) => m.id === medicineId);
    if (!med) return;

    const newBatch: Batch = {
      ...batchData,
      id: `bat-${Date.now()}`,
      medicineId,
      medicineName: med.name,
      status: getBatchExpiryStatus(batchData.expiryDate),
    };

    const updatedBatches = [...med.batches, newBatch];
    updateMedicine(medicineId, {
      batches: updatedBatches,
      totalStock: updatedBatches.reduce((s, b) => s + b.quantity, 0),
    });
  };

  // Update Batch Stock
  const updateBatchStock = (medicineId: string, batchId: string, newQuantity: number) => {
    const med = medicines.find((m) => m.id === medicineId);
    if (!med) return;

    const updatedBatches = med.batches.map((b) =>
      b.id === batchId ? { ...b, quantity: Math.max(0, newQuantity) } : b
    );

    updateMedicine(medicineId, {
      batches: updatedBatches,
      totalStock: updatedBatches.reduce((s, b) => s + b.quantity, 0),
    });
  };

  // Remove Batch
  const removeBatch = (medicineId: string, batchId: string) => {
    const med = medicines.find((m) => m.id === medicineId);
    if (!med) return;

    const updatedBatches = med.batches.filter((b) => b.id !== batchId);
    updateMedicine(medicineId, {
      batches: updatedBatches,
      totalStock: updatedBatches.reduce((s, b) => s + b.quantity, 0),
    });
  };

  // Suppliers
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'totalOrders'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      totalOrders: 0,
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  // Billing: Auto FEFO stock decrement
  const createBill = (billData: Omit<Bill, 'id' | 'invoiceNumber' | 'date'>): Bill => {
    const invoiceNum = `INV-${new Date().getFullYear()}-${String(bills.length + 1).padStart(4, '0')}`;
    const newBill: Bill = {
      ...billData,
      id: `bill-${Date.now()}`,
      invoiceNumber: invoiceNum,
      date: new Date().toISOString(),
    };

    setMedicines((prevMeds) => {
      const updated = [...prevMeds];
      for (const item of billData.items) {
        const medIndex = updated.findIndex((m) => m.id === item.medicineId);
        if (medIndex !== -1) {
          const med = { ...updated[medIndex] };
          const batchIndex = med.batches.findIndex((b) => b.id === item.batchId);
          if (batchIndex !== -1) {
            const batch = { ...med.batches[batchIndex] };
            batch.quantity = Math.max(0, batch.quantity - item.quantity);
            med.batches = [...med.batches];
            med.batches[batchIndex] = batch;
            med.totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
            updated[medIndex] = med;

            if (med.totalStock <= med.minStockAlert) {
              const lowStockNotif: NotificationItem = {
                id: `notif-${Date.now()}-${med.id}`,
                type: 'stock',
                title: `⚠️ Stock Alert: ${med.name}`,
                message: `Remaining stock is down to ${med.totalStock} units.`,
                timestamp: 'Just now',
                read: false,
                link: '/inventory',
                severity: med.totalStock === 0 ? 'danger' : 'warning',
              };
              setNotifications((n) => [lowStockNotif, ...n]);
            }
          }
        }
      }
      return updated;
    });

    setBills((prev) => [newBill, ...prev]);
    return newBill;
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const updateSettings = (updates: Partial<PharmacySettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  // EXPLICIT DEMO DATA LOADER (For Dev / Testing / Demo only)
  const loadDemoData = () => {
    setMedicines(DEMO_MEDICINES);
    setSuppliers(DEMO_SUPPLIERS);
    setBills(DEMO_BILLS);
    setSettings(DEMO_SETTINGS);
  };

  // RESET TO CLEAN ZERO-RECORD STATE
  const clearAllData = () => {
    setMedicines([]);
    setSuppliers([]);
    setBills([]);
    setNotifications([]);
    setSettings(DEFAULT_CLEAN_SETTINGS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MEDICINES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SUPPLIERS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.BILLS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS);
  };

  // Dynamic AI Insights Calculation based on real inventory
  const generateRealInsights = (): AIInsight[] => {
    if (medicines.length === 0) return [];

    const generated: AIInsight[] = [];

    // Check stockout risks
    const criticalMeds = medicines.filter((m) => m.totalStock <= m.minStockAlert);
    if (criticalMeds.length > 0) {
      generated.push({
        id: 'ai-stockout-1',
        type: 'stockout_risk',
        severity: 'critical',
        title: `${criticalMeds.length} medicine${criticalMeds.length > 1 ? 's' : ''} below safety threshold`,
        description: `${criticalMeds.map((m) => m.name).slice(0, 3).join(', ')} require urgent replenishment.`,
        metric: `${criticalMeds.length} items at risk`,
        recommendedAction: 'Issue purchase orders to verified suppliers',
        actionType: 'restock',
        estimatedImpact: 'Prevents customer stockouts and prescription turnaways',
        date: new Date().toISOString().split('T')[0],
      });
    }

    // Check expiry risks
    const expiringBatches = medicines.flatMap((m) =>
      m.batches.filter((b) => getBatchExpiryStatus(b.expiryDate) === 'Near Expiry')
    );
    if (expiringBatches.length > 0) {
      generated.push({
        id: 'ai-expiry-1',
        type: 'expiry_alert',
        severity: 'warning',
        title: `${expiringBatches.length} batch${expiringBatches.length > 1 ? 'es' : ''} expiring within 30 days`,
        description: `Batches including ${expiringBatches.map((b) => b.batchNumber).slice(0, 2).join(', ')} expire soon. Prioritize via FEFO routing.`,
        metric: 'Fast clearance advised',
        recommendedAction: 'Enforce FEFO at billing and review fast-clearance discounts',
        actionType: 'discount',
        estimatedImpact: 'Minimizes financial loss from expired write-offs',
        date: new Date().toISOString().split('T')[0],
      });
    }

    // Check purchase reorder recommendations
    const outOfStockMeds = medicines.filter((m) => m.totalStock === 0);
    if (outOfStockMeds.length > 0) {
      generated.push({
        id: 'ai-reorder-1',
        type: 'purchase_recommendation',
        severity: 'info',
        title: `Reorder needed for ${outOfStockMeds[0].name}`,
        description: `Currently at 0 units. Suggested initial reorder: ${outOfStockMeds[0].reorderQuantity || 50} units.`,
        metric: `Suggested order: ${outOfStockMeds[0].reorderQuantity || 50} units`,
        medicineId: outOfStockMeds[0].id,
        recommendedAction: 'Draft and dispatch Purchase Order to distributor',
        actionType: 'order',
        estimatedImpact: 'Restores regular prescription fulfillment',
        date: new Date().toISOString().split('T')[0],
      });
    }

    return generated;
  };

  const insights = generateRealInsights();
  const hasData = medicines.length > 0;
  const totalMedicinesCount = medicines.length;
  const lowStockCount = medicines.filter((m) => m.totalStock <= m.minStockAlert).length;

  const allBatches = medicines.flatMap((m) =>
    m.batches.map((b) => ({
      ...b,
      category: m.category,
      requiresPrescription: Boolean(m.requiresPrescription || m.prescriptionRequired),
      status: getBatchExpiryStatus(b.expiryDate),
    }))
  );

  const expiringSoonCount = allBatches.filter(
    (b) => b.status === 'Near Expiry' || b.status === 'Monitor'
  ).length;

  const expiredCount = allBatches.filter((b) => b.status === 'Expired').length;

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todaySalesTotal = bills
    .filter((b) => ((b.date || b.createdAt || '') as string).startsWith(todayDateStr))
    .reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <AppContext.Provider
      value={{
        medicines,
        suppliers,
        bills,
        insights,
        notifications,
        settings,
        hasData,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        getMedicineById,
        addBatch,
        updateBatchStock,
        removeBatch,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        createBill,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        dismissNotification,
        updateSettings,
        loadDemoData,
        clearAllData,
        totalMedicinesCount,
        lowStockCount,
        expiringSoonCount,
        expiredCount,
        todaySalesTotal,
        allBatches,
        getStockStatus,
        getBatchExpiryStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
