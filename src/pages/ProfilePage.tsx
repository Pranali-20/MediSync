import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  Clock,
  Save,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useToast } from '../context/ToastContext';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState(user?.role || 'Chief Pharmacist');
  const [pharmacyName, setPharmacyName] = useState(user?.pharmacyName || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.licenseNumber || '');
  const [shiftHours, setShiftHours] = useState(user?.shiftHours || '08:00 AM - 04:00 PM');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name,
      email,
      phone,
      role,
      pharmacyName,
      licenseNumber,
      shiftHours,
    });
    setIsSaved(true);
    showToast('Profile Saved', 'Pharmacist details updated successfully.');
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pharmacist Profile</h1>
        <p className="text-sm text-brand-muted mt-0.5">
          Manage your personal credentials, registration details, and assigned store role.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card Header */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=250&auto=format&fit=crop'}
                alt="Pharmacist Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-pharmagreen-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => showToast('Photo Upload', 'Select image file from device')}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-pharmagreen-600 text-white shadow hover:bg-pharmagreen-700"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-gray-900">{name || 'Dr. Pharmacist'}</h3>
              <p className="text-xs text-pharmagreen-700 font-semibold">{role}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-xs text-brand-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-pharmagreen-600" />
                <span>Reg No: {licenseNumber || 'Pending'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Details Inputs */}
        <Card title="Personal & Professional Information" subtitle="Official registration and contact points">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Pharmacy Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
              >
                <option value="Chief Pharmacist & Store Manager">Chief Pharmacist & Store Manager</option>
                <option value="Licensed Pharmacist">Licensed Pharmacist</option>
                <option value="Pharmacy Owner">Pharmacy Owner</option>
                <option value="Pharmacy Technician">Pharmacy Technician</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Pharmacy Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Pharmacist License / Registration No
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="PH-REG-2026-XXXX"
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Shift Timing
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={shiftHours}
                  onChange={(e) => setShiftHours(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <span className="text-xs text-pharmagreen-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
            </span>
          ) : (
            <span />
          )}

          <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
