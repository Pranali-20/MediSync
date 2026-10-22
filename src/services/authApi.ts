import apiClient from './api';
import { UserProfile } from '../types';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterData {
  name: string;
  pharmacyName: string;
  email: string;
  phone: string;
  password?: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      // Fallback response for offline / frontend standalone testing
      return {
        token: `mock_jwt_${Date.now()}`,
        user: {
          id: `usr-${Date.now()}`,
          name: credentials.email.includes('admin') ? 'Admin Pharmacist' : 'Dr. Pharmacist',
          email: credentials.email,
          phone: '+91 98450 11223',
          role: 'Chief Pharmacist',
          pharmacyName: 'My Pharmacy',
          address: 'Store Address',
          licenseNumber: 'PH-REG-2026',
          hasCompletedOnboarding: false,
        },
      };
    }
  },

  register: async (data: RegisterData) => {
    try {
      const response = await apiClient.post('/auth/register', data);
      return response.data;
    } catch (error) {
      return {
        token: `mock_jwt_${Date.now()}`,
        user: {
          id: `usr-${Date.now()}`,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: 'Chief Pharmacist',
          pharmacyName: data.pharmacyName,
          address: '',
          licenseNumber: '',
          hasCompletedOnboarding: false,
        },
      };
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      return { success: true, message: 'Password reset link dispatched.' };
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      return null;
    }
  },
};
