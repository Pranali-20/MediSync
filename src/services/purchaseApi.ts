import apiClient from './api';
import { PurchaseOrder } from '../types';

export const purchaseApi = {
  getPurchaseOrders: async (params?: { status?: string; supplierId?: string; search?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('/purchases', { params });
    return res.data;
  },

  getPurchaseOrderById: async (id: string): Promise<PurchaseOrder> => {
    const res = await apiClient.get(`/purchases/${id}`);
    return res.data?.data || res.data;
  },

  createPurchaseOrder: async (data: {
    supplierId: string;
    items: Array<{ medicineId: string; quantityOrdered: number; unitPrice: number; expectedBatchNumber?: string }>;
    expectedDeliveryDate?: string;
    notes?: string;
    status?: string;
  }): Promise<PurchaseOrder> => {
    const res = await apiClient.post('/purchases', data);
    return res.data?.data || res.data;
  },

  receiveShipment: async (
    orderId: string,
    data: {
      invoiceReference?: string;
      notes?: string;
      receivedItems: Array<{
        medicineId: string;
        batchNumber: string;
        quantityReceived: number;
        purchasePrice: number;
        sellingPrice: number;
        manufacturingDate?: string;
        expiryDate: string;
      }>;
    }
  ): Promise<PurchaseOrder> => {
    const res = await apiClient.post(`/purchases/${orderId}/receive`, data);
    return res.data?.data || res.data;
  },

  getPriceHistory: async (medicineId?: string) => {
    const res = await apiClient.get('/purchases/price-history', { params: { medicineId } });
    return res.data?.data || res.data;
  },
};
