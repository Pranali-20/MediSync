import apiClient from './api';
import { Medicine, Batch } from '../types';

export const medicineApi = {
  getMedicines: async (params?: { search?: string; category?: string; stockStatus?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('/medicines', { params });
    return res.data;
  },

  searchMedicines: async (q: string) => {
    const res = await apiClient.get('/medicines/search', { params: { q } });
    return res.data?.data || res.data;
  },

  getMedicineByBarcode: async (barcode: string) => {
    const res = await apiClient.get(`/medicines/barcode/${barcode}`);
    return res.data?.data || res.data;
  },

  getMedicineById: async (id: string): Promise<Medicine> => {
    const res = await apiClient.get(`/medicines/${id}`);
    return res.data?.data || res.data;
  },

  createMedicine: async (data: any): Promise<Medicine> => {
    const res = await apiClient.post('/medicines', data);
    return res.data?.data || res.data;
  },

  addBatchToMedicine: async (medicineId: string, batchData: any): Promise<{ batch: Batch; medicine: Medicine }> => {
    const res = await apiClient.post(`/medicines/${medicineId}/batches`, batchData);
    return res.data?.data || res.data;
  },

  updateMedicine: async (id: string, data: Partial<Medicine>): Promise<Medicine> => {
    const res = await apiClient.put(`/medicines/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteMedicine: async (id: string) => {
    const res = await apiClient.delete(`/medicines/${id}`);
    return res.data;
  },

  deleteBatch: async (medicineId: string, batchId: string) => {
    const res = await apiClient.delete(`/medicines/${medicineId}/batches/${batchId}`);
    return res.data;
  },
};
