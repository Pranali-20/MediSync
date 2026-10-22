import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, User, Phone, MapPin, ShieldCheck, Pill, ArrowRight, Check } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

export const OnboardingPage: React.FC = () => {
  const { user, completeOnboarding } = useAuth();
  const { addMedicine, updateSettings } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Profile State
  const [pharmacyName, setPharmacyName] = useState(user?.pharmacyName || '');
  const [pharmacistName, setPharmacistName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Step 2: First Medicine Form State
  const [medName, setMedName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('Analgesics & Antipyretics');
  const [mrp, setMrp] = useState('30.00');
  const [costPrice, setCostPrice] = useState('18.00');
  const [initialQty, setInitialQty] = useState('50');
  const [batchNo, setBatchNo] = useState(`BAT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [expDate, setExpDate] = useState('2028-06-30');

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName.trim() || !pharmacistName.trim()) {
      showToast('Required Information', 'Please provide your pharmacy and pharmacist name', 'warning');
      return;
    }

    updateSettings({
      pharmacyName,
      address,
      phone,
      gstin: gstNumber,
      licenseNumber,
    });

    completeOnboarding({
      pharmacyName,
      name: pharmacistName,
      phone,
      address,
      gstNumber,
      licenseNumber,
    });

    showToast('Profile Configured', 'Step 1 completed.');
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      showToast('Medicine Name Required', 'Please enter your medicine name', 'warning');
      return;
    }

    addMedicine({
      name: medName,
      genericName: genericName || medName,
      category,
      manufacturer: 'Generic Pharmaceutical',
      dosageForm: 'Tablet',
      strength: '500mg',
      minStockAlert: 15,
      reorderQuantity: 50,
      unitPrice: Number(mrp),
      sellingPrice: Number(mrp),
      purchasePrice: Number(costPrice),
      location: 'Rack A - Shelf 1',
      requiresPrescription: false,
      prescriptionRequired: false,
      batches: [],
      initialBatch: {
        batchNumber: batchNo,
        manufacturingDate: new Date().toISOString().split('T')[0],
        expiryDate: expDate,
        quantity: Number(initialQty),
        initialQuantity: Number(initialQty),
        purchasePrice: Number(costPrice),
        mrp: Number(mrp),
        barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
        status: 'Normal',
      },
    });

    showToast('First Medicine Added!', 'Your pharmacy inventory is now active.');
    navigate('/dashboard');
  };

  const handleSkip = () => {
    showToast('Welcome to MediSync', 'Your blank workspace is ready.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between py-4">
        <Logo size="md" showTagline={false} />
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span className={`px-2.5 py-1 rounded-full ${step === 1 ? 'bg-pharmagreen-600 text-white' : 'bg-pharmagreen-100 text-pharmagreen-800'}`}>
            1. Store Profile
          </span>
          <span>→</span>
          <span className={`px-2.5 py-1 rounded-full ${step === 2 ? 'bg-pharmagreen-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            2. First Medicine
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-2xl mx-auto w-full my-auto">
        {step === 1 ? (
          <Card className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Pharmacy Profile</h2>
              <p className="text-xs text-brand-muted mt-1">
                Set up your store identity to begin managing medicines and generating valid invoices.
              </p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
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
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Pharmacist Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={pharmacistName}
                      onChange={(e) => setPharmacistName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Drug License Number (Optional)
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="DL-2026-XXXX"
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Store Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Plot 42, Main Road, Bengaluru"
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>
                  Continue to Add Medicine
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Let's add your first medicine</h2>
                <p className="text-xs text-brand-muted mt-1">
                  Enter an initial medicine lot or skip to explore the clean workspace.
                </p>
              </div>
              <button
                onClick={handleSkip}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
              >
                Skip & Go to Dashboard →
              </button>
            </div>

            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Medicine Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Generic / Salt Name
                  </label>
                  <input
                    type="text"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    placeholder="e.g. Acetaminophen"
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="e.g. BAT-2601"
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Initial Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={initialQty}
                    onChange={(e) => setInitialQty(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    MRP / Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Purchase Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 bg-[#F8FAF9]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-brand-border">
                <Button type="button" variant="outline" onClick={handleSkip}>
                  Skip for now
                </Button>
                <Button type="submit" variant="primary" size="lg" icon={<Check className="w-4 h-4" />}>
                  Save & Open Workspace
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <div className="text-center text-xs text-brand-muted py-2">
        MediSync • Built for modern medical operations
      </div>
    </div>
  );
};
