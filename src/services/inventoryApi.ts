import apiClient from './api';

export const inventoryApi = {
  getInventory: async (params?: { status?: string; search?: string }) => {
    const res = await apiClient.get('/inventory', { params });
    return res.data?.data || res.data;
  },

  getLowStock: async () => {
    const res = await apiClient.get('/inventory/low-stock');
    return res.data?.data || res.data;
  },

  getOutOfStock: async () => {
    const res = await apiClient.get('/inventory/out-of-stock');
    return res.data?.data || res.data;
  },

  getExpiry: async () => {
    const res = await apiClient.get('/inventory/expiry');
    return res.data?.data || res.data;
  },

  adjustStock: async (data: {
    medicineId: string;
    batchId: string;
    type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
    quantity: number;
    reason: string;
    notes?: string;
  }) => {
    const res = await apiClient.post('/inventory/adjust', data);
    return res.data?.data || res.data;
  },

  getTransactions: async (params?: { page?: number; limit?: number; type?: string; medicineId?: string }) => {
    const res = await apiClient.get('/inventory/transactions', { params });
    return res.data;
  },
};
