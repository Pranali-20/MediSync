import apiClient from './api';

export const notificationApi = {
  getNotifications: async () => {
    const res = await apiClient.get('/notifications');
    return res.data?.data || res.data;
  },

  markAsRead: async (id: string) => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data?.data || res.data;
  },

  clearAll: async () => {
    const res = await apiClient.post('/notifications/clear-all');
    return res.data?.data || res.data;
  },
};

export const auditApi = {
  getAuditLogs: async (params?: { entity?: string; action?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('/audit-logs', { params });
    return res.data;
  },
};

export const userApi = {
  getUsers: async () => {
    const res = await apiClient.get('/users');
    return res.data?.data || res.data;
  },

  createUser: async (data: { name: string; email: string; password: string; role: string; phone?: string; licenseNumber?: string; shiftHours?: string }) => {
    const res = await apiClient.post('/users', data);
    return res.data?.data || res.data;
  },

  updateUserRole: async (id: string, data: { role?: string; isActive?: boolean }) => {
    const res = await apiClient.put(`/users/${id}/role`, data);
    return res.data?.data || res.data;
  },
};

export const aiApi = {
  getInsights: async () => {
    const res = await apiClient.get('/ai/insights');
    return res.data?.data || res.data;
  },
};

export const supplierApi = {
  getSuppliers: async () => {
    const res = await apiClient.get('/suppliers');
    return res.data?.data || res.data;
  },

  getSupplierById: async (id: string) => {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data?.data || res.data;
  },

  createSupplier: async (data: any) => {
    const res = await apiClient.post('/suppliers', data);
    return res.data?.data || res.data;
  },

  updateSupplier: async (id: string, data: any) => {
    const res = await apiClient.put(`/suppliers/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteSupplier: async (id: string) => {
    const res = await apiClient.delete(`/suppliers/${id}`);
    return res.data;
  },
};
