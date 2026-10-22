import apiClient from './api';
import { Bill } from '../types';

export const billingApi = {
  getSales: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/billing/sales', { params });
    return res.data;
  },

  getSaleById: async (id: string): Promise<Bill> => {
    const res = await apiClient.get(`/billing/sales/${id}`);
    return res.data?.data || res.data;
  },

  createSale: async (data: {
    customerName?: string;
    customerPhone?: string;
    doctorName?: string;
    items: Array<{
      medicineId: string;
      batchId?: string;
      quantity: number;
      unitPrice?: number;
      taxPercent?: number;
    }>;
    discountPercent?: number;
    paymentMethod?: string;
  }): Promise<Bill> => {
    const res = await apiClient.post('/billing/sales', data);
    return res.data?.data || res.data;
  },

  processSaleReturn: async (
    saleId: string,
    data: {
      returnItems: Array<{
        saleItemId?: string;
        medicineId?: string;
        batchId?: string;
        quantity: number;
        condition: 'SELLABLE' | 'DAMAGED' | 'EXPIRED' | 'NON_RESELLABLE';
        reason?: string;
      }>;
      reason?: string;
    }
  ): Promise<Bill> => {
    const res = await apiClient.post(`/billing/sales/${saleId}/return`, data);
    return res.data?.data || res.data;
  },

  getTodaySales: async () => {
    const res = await apiClient.get('/billing/today');
    return res.data?.data || res.data;
  },
};
