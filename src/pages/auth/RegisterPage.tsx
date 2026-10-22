import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Building, Mail, Phone, Lock, MapPin, FileCheck, ShieldCheck, Building2, Store, Layers } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PharmacyType } from '../../types';

export const RegisterPage: React.FC = () => {
  const [pharmacistName, setPharmacistName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Pharmacy Details
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyType, setPharmacyType] = useState<PharmacyType>('retail');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pharmacistName.trim() || !pharmacyName.trim() || !email.trim() || !password.trim()) {
      showToast('Validation Error', 'Please complete all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Password Mismatch', 'Password and Confirm Password do not match.', 'error');
      return;
    }

    if (!agreedToTerms) {
      showToast('Agreement Required', 'Please accept the Terms of Service to proceed.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: pharmacistName.trim(),
        pharmacyName: pharmacyName.trim(),
        pharmacyType,
        email: email.trim(),
        phone: phone.trim() || pharmacyPhone.trim(),
        password,
        address: address.trim(),
        gstNumber: gstNumber.trim(),
        licenseNumber: licenseNumber.trim(),
      });

      if (res.success) {
        showToast('Account Created!', 'Welcome to MediSync. Your workspace is ready.');
        navigate('/onboarding');
      } else {
        showToast('Registration Error', res.message || 'Unable to create account.', 'error');
      }
    } catch {
      showToast('Registration Error', 'Unable to create account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions: Array<{
    type: PharmacyType;
    title: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      type: 'hospital',
      title: 'Hospital-Attached',
      description: 'Manage hospital prescriptions, patients, dispensing and pharmacy inventory.',
      icon: Building2,
    },
    {
      type: 'retail',
      title: 'Open-Counter / Retail',
      description: 'Manage customer billing, medicines, inventory, suppliers and sales.',
      icon: Store,
    },
    {
      type: 'hybrid',
      title: 'Hybrid',
      description: 'Manage both hospital dispensing and retail pharmacy operations.',
      icon: Layers,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-brand-border p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <Logo size="md" showTagline={false} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Your Pharmacy Account</h1>
          <p className="text-xs text-brand-muted mt-1">
            Zero fake data. Real inventory workflows. Multi-tenant isolated workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Pharmacist Details */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-2 border-b border-brand-border mb-3">
              1. Pharmacist Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={pharmacistName}
                    onChange={(e) => setPharmacistName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full bg-[#F8FAF9] text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacist@mypharmacy.com"
                    className="w-full bg-[#F8FAF9] text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 11223"
                    className="w-full bg-[#F8FAF9] text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F8FAF9] text-xs pl-7 pr-2 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Confirm <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F8FAF9] text-xs pl-7 pr-2 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pharmacy Details */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-2 border-b border-brand-border mb-3">
              2. Pharmacy Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pharmacy Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="e.g. Apex Health Pharmacy"
                    className="w-full bg-[#F8FAF9] text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pharmacy Phone / Contact</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={pharmacyPhone}
                    onChange={(e) => setPharmacyPhone(e.target.value)}
                    placeholder="+91 020 256789"
                    className="w-full bg-[#F8FAF9] text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Address / Location</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop No. / Hospital Wing, Street, City"
                    className="w-full bg-[#F8FAF9] text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="e.g. 27AABCS1429B1Z8"
                  className="w-full bg-[#F8FAF9] text-sm px-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Drug License Number (Optional)</label>
                <div className="relative">
                  <FileCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. DL-20B-10928"
                    className="w-full bg-[#F8FAF9] text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pharmacy Type Selector */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                3. Select Pharmacy Operational Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {typeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = pharmacyType === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => setPharmacyType(opt.type)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-pharmagreen-600 bg-pharmagreen-50/50 shadow-xs'
                          : 'border-brand-border bg-[#F8FAF9] hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-pharmagreen-600 text-white' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-bold text-gray-900">{opt.title}</div>
                      </div>
                      <p className="text-[11px] text-brand-muted leading-snug">{opt.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600">
              <input
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-pharmagreen-600 focus:ring-pharmagreen-600"
              />
              <span>
                I agree to the <span className="text-pharmagreen-700 font-semibold">Terms of Service</span> and acknowledge that MediSync is an inventory and operational system, not a medical diagnosis tool.
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-semibold shadow-xs"
            >
              Complete Registration & Open Workspace
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-brand-border text-center text-xs text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-pharmagreen-700 hover:text-pharmagreen-800 ml-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

