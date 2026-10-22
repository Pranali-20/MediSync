import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { pharmacyType } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-brand-border p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Hospital Module Access Required</h2>
        <p className="text-xs text-brand-muted leading-relaxed mb-6">
          This feature (Patients, Prescriptions & Dispensing) is configured for{' '}
          <strong className="text-gray-800">Hospital-Attached</strong> and{' '}
          <strong className="text-gray-800">Hybrid</strong> pharmacies.
          <br />
          Your current active workspace mode is:{' '}
          <span className="inline-block uppercase font-bold text-pharmagreen-700 bg-pharmagreen-50 px-2 py-0.5 rounded text-[11px] mt-1 border border-pharmagreen-200">
            {pharmacyType}
          </span>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto text-xs"
          >
            Back to Dashboard
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Settings className="w-4 h-4" />}
            onClick={() => navigate('/settings')}
            className="w-full sm:w-auto text-xs"
          >
            Pharmacy Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
