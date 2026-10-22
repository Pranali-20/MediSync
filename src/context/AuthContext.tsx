import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, PharmacyType, PharmacyProfile } from '../types';

interface RegisterPayload {
  name: string;
  pharmacyName: string;
  pharmacyType: PharmacyType;
  email: string;
  phone: string;
  password?: string;
  address?: string;
  gstNumber?: string;
  licenseNumber?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  pharmacy: PharmacyProfile | null;
  pharmacyType: PharmacyType;
  isHospital: boolean;
  isRetail: boolean;
  isHybrid: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  updatePharmacyType: (type: PharmacyType) => Promise<boolean>;
  completeOnboarding: (details: Partial<UserProfile>) => void;
  refreshUser: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pharmaflow_jwt_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pharmaflow_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const pharmacyType: PharmacyType = user?.pharmacyType || user?.pharmacy?.type || 'retail';
  const isHospital = pharmacyType === 'hospital';
  const isRetail = pharmacyType === 'retail';
  const isHybrid = pharmacyType === 'hybrid';

  useEffect(() => {
    if (user) {
      localStorage.setItem('pharmaflow_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pharmaflow_auth_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('pharmaflow_jwt_token', token);
    } else {
      localStorage.removeItem('pharmaflow_jwt_token');
    }
  }, [token]);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const u = json.data;
        const p = u.pharmacy;
        const profile: UserProfile = {
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role || 'Chief Pharmacist',
          pharmacyName: p?.name || 'My Pharmacy',
          pharmacyType: p?.type || 'retail',
          pharmacy: p
            ? {
                id: p._id || p.id,
                name: p.name,
                type: p.type || 'retail',
                phone: p.phone || '',
                email: p.email || '',
                address: p.address || '',
                gstNumber: p.gstNumber || '',
                licenseNumber: p.licenseNumber || '',
              }
            : undefined,
          address: p?.address || '',
          licenseNumber: p?.licenseNumber || '',
          gstNumber: p?.gstNumber || '',
          hasCompletedOnboarding: true,
        };
        setUser(profile);
      }
    } catch {
      // Offline fallback
    }
  };

  const login = async (email: string, password = 'password123'): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        return { success: false, message: json.message || 'Login failed. Please check credentials.' };
      }

      const { token: jwtToken, user: u, pharmacy: p } = json.data;
      setToken(jwtToken);

      const profile: UserProfile = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: u.role === 'admin' ? 'Administrator' : 'Chief Pharmacist',
        pharmacyName: p?.name || 'My Pharmacy',
        pharmacyType: p?.type || 'retail',
        pharmacy: p,
        address: p?.address || '',
        licenseNumber: p?.licenseNumber || '',
        gstNumber: p?.gstNumber || '',
        hasCompletedOnboarding: true,
      };

      setUser(profile);
      return { success: true };
    } catch {
      // Fallback for local testing without backend
      const lower = email.toLowerCase();
      let type: PharmacyType = 'retail';
      if (lower.includes('hospital')) type = 'hospital';
      else if (lower.includes('hybrid')) type = 'hybrid';

      const fallbackUser: UserProfile = {
        id: `usr-${Date.now()}`,
        name: email.split('@')[0].replace('.', ' '),
        email,
        phone: '',
        role: 'Chief Pharmacist',
        pharmacyName: type === 'hospital' ? 'Apex City Hospital Pharmacy' : type === 'hybrid' ? 'Metro Health Care & Retail' : 'Community Pharmacy',
        pharmacyType: type,
        address: '',
        licenseNumber: '',
        hasCompletedOnboarding: true,
      };
      setToken(`fallback_${Date.now()}`);
      setUser(fallbackUser);
      return { success: true };
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          pharmacyName: payload.pharmacyName,
          pharmacyType: payload.pharmacyType || 'retail',
          email: payload.email.trim(),
          phone: payload.phone,
          password: payload.password || 'password123',
          address: payload.address || '',
          gstNumber: payload.gstNumber || '',
          licenseNumber: payload.licenseNumber || '',
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        return { success: false, message: json.message || 'Registration failed.' };
      }

      const { token: jwtToken, user: u, pharmacy: p } = json.data;
      setToken(jwtToken);

      const profile: UserProfile = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: 'Chief Pharmacist & Owner',
        pharmacyName: p?.name || payload.pharmacyName,
        pharmacyType: p?.type || payload.pharmacyType || 'retail',
        pharmacy: p,
        address: payload.address || '',
        licenseNumber: payload.licenseNumber || '',
        gstNumber: payload.gstNumber || '',
        hasCompletedOnboarding: false,
      };

      setUser(profile);
      return { success: true };
    } catch {
      // Local fallback
      const fallbackUser: UserProfile = {
        id: `usr-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: 'Chief Pharmacist & Owner',
        pharmacyName: payload.pharmacyName,
        pharmacyType: payload.pharmacyType || 'retail',
        address: payload.address || '',
        licenseNumber: payload.licenseNumber || '',
        hasCompletedOnboarding: false,
      };
      setToken(`jwt_reg_${Date.now()}`);
      setUser(fallbackUser);
      return { success: true };
    }
  };

  const updatePharmacyType = async (newType: PharmacyType): Promise<boolean> => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/pharmacy/type`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type: newType }),
        });
      }
      setUser((prev) => (prev ? { ...prev, pharmacyType: newType, pharmacy: prev.pharmacy ? { ...prev.pharmacy, type: newType } : undefined } : null));
      return true;
    } catch {
      setUser((prev) => (prev ? { ...prev, pharmacyType: newType } : null));
      return true;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const completeOnboarding = (details: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...details, hasCompletedOnboarding: true } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        pharmacy: user?.pharmacy || null,
        pharmacyType,
        isHospital,
        isRetail,
        isHybrid,
        isAuthenticated: !!user,
        token,
        login,
        register,
        logout,
        updateUser,
        updatePharmacyType,
        completeOnboarding,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

