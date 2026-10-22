import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';

// App Pages
import { DashboardPage } from './pages/DashboardPage';
import { MedicinesPage } from './pages/MedicinesPage';
import { AddMedicinePage } from './pages/AddMedicinePage';
import { MedicineDetailPage } from './pages/MedicineDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { BillingPage } from './pages/BillingPage';
import { ExpiryPage } from './pages/ExpiryPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AIInsightsPage } from './pages/AIInsightsPage';
import { ScannerPage } from './pages/ScannerPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { PatientsPage } from './pages/PatientsPage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { DispensingPage } from './pages/DispensingPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user registered and has not completed onboarding, route them to onboarding
  if (user && !user.hasCompletedOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Hospital & Hybrid Protected Route Guard
const HospitalRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isHospital, isHybrid } = useAuth();
  if (!isHospital && !isHybrid) {
    return <AccessDeniedPage />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Onboarding Flow */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />

              {/* Main Protected Workspace */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Hospital / Hybrid Scoped Routes */}
                <Route
                  path="patients"
                  element={
                    <HospitalRoute>
                      <PatientsPage />
                    </HospitalRoute>
                  }
                />
                <Route
                  path="prescriptions"
                  element={
                    <HospitalRoute>
                      <PrescriptionsPage />
                    </HospitalRoute>
                  }
                />
                <Route
                  path="dispensing"
                  element={
                    <HospitalRoute>
                      <DispensingPage />
                    </HospitalRoute>
                  }
                />

                {/* General Management Routes */}
                <Route path="medicines" element={<MedicinesPage />} />
                <Route path="medicines/add" element={<AddMedicinePage />} />
                <Route path="medicines/edit/:id" element={<AddMedicinePage />} />
                <Route path="medicines/:id" element={<MedicineDetailPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="purchases" element={<PurchasesPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="expiry" element={<ExpiryPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="ai-insights" element={<AIInsightsPage />} />
                <Route path="scanner" element={<ScannerPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
