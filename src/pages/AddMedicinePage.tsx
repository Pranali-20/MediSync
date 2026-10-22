import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Barcode } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const AddMedicinePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addMedicine, updateMedicine, getMedicineById, suppliers } = useApp();

  const isEditMode = Boolean(id);

  // Form State
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('Analgesics & Antipyretics');
  const [manufacturer, setManufacturer] = useState('Dr. Reddy\'s Laboratories');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [strength, setStrength] = useState('500mg');
  const [requiresPrescription, setRequiresPrescription] = useState(false);

  // Batch details
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('2026-03-01');
  const [expDate, setExpDate] = useState('2028-03-31');
  const [barcode, setBarcode] = useState('');

  // Pricing & Stock
  const [mrp, setMrp] = useState('30.00');
  const [purchasePrice, setPurchasePrice] = useState('18.00');
  const [quantity, setQuantity] = useState('50');
  const [minStockAlert, setMinStockAlert] = useState('20');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || 'sup-1');
  const [location, setLocation] = useState('Rack A - Shelf 1');

  // Load existing medicine if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const existing = getMedicineById(id);
      if (existing) {
        setName(existing.name);
        setGenericName(existing.genericName);
        setCategory(existing.category);
        setManufacturer(existing.manufacturer);
        setDosageForm(existing.dosageForm);
        setStrength(existing.strength);
        setRequiresPrescription(Boolean(existing.requiresPrescription || existing.prescriptionRequired));
        setMrp(String(existing.unitPrice || existing.sellingPrice || 0));
        setPurchasePrice(String(existing.purchasePrice || 0));
        setMinStockAlert(String(existing.minStockAlert));
        setLocation(existing.location);
      }
    } else {
      // Auto-generate sample batch number
      setBatchNumber(`BAT-${Math.floor(1000 + Math.random() * 9000)}`);
      setBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
    }
  }, [id, isEditMode, getMedicineById, suppliers]);

  const handleGenerateBarcode = () => {
    setBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);

    if (isEditMode && id) {
      updateMedicine(id, {
        name,
        genericName,
        category,
        manufacturer,
        dosageForm,
        strength,
        requiresPrescription,
        prescriptionRequired: requiresPrescription,
        unitPrice: Number(mrp),
        sellingPrice: Number(mrp),
        purchasePrice: Number(purchasePrice),
        minStockAlert: Number(minStockAlert),
        location,
      });
      navigate(`/medicines/${id}`);
    } else {
      const createdMed = addMedicine({
        name,
        genericName,
        category,
        manufacturer,
        dosageForm,
        strength,
        requiresPrescription,
        prescriptionRequired: requiresPrescription,
        unitPrice: Number(mrp),
        sellingPrice: Number(mrp),
        purchasePrice: Number(purchasePrice),
        minStockAlert: Number(minStockAlert),
        reorderQuantity: Number(minStockAlert) * 3,
        location,
        batches: [],
        initialBatch: {
          batchNumber: batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
          manufacturingDate: mfgDate,
          expiryDate: expDate,
          quantity: Number(quantity),
          initialQuantity: Number(quantity),
          purchasePrice: Number(purchasePrice),
          mrp: Number(mrp),
          supplierId,
          supplierName: selectedSupplier?.name || 'Authorized Supplier',
          barcode: barcode || `890${Math.floor(100000000 + Math.random() * 900000000)}`,
          status: 'Normal',
        },
      });

      navigate(`/medicines/${createdMed.id}`);
    }
  };

  const categories = [
    'Analgesics & Antipyretics',
    'Antibiotics',
    'Antihistamines',
    'Pain Relief & NSAIDs',
    'Gastrointestinal & Antacids',
    'Antidiabetic',
    'Cardiovascular',
    'Respiratory & Anti-allergy',
    'Vitamins & Supplements',
    'Dermatologicals',
    'Ophthalmic',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Medicine' : 'Add New Medicine'}
            </h1>
            <p className="text-xs text-brand-muted mt-0.5">
              {isEditMode
                ? 'Update medicine details and pricing.'
                : 'Register a new pharmaceutical item and initial batch into inventory.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <Card title="1. Basic Information" subtitle="Primary pharmaceutical identification">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Medicine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Paracetamol 500mg, Amoxicillin 500mg"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Generic / Salt Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Acetaminophen, Amoxicillin Trihydrate"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Manufacturer / Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Cipla, Sun Pharma, Abbott"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Dosage Form
                </label>
                <select
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Drops">Drops</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Strength
                </label>
                <input
                  type="text"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="500mg, 10ml"
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
                />
              </div>
            </div>

            <div className="sm:col-span-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresPrescription}
                  onChange={(e) => setRequiresPrescription(e.target.checked)}
                  className="w-4 h-4 rounded text-pharmagreen-600 focus:ring-pharmagreen-500"
                />
                <span className="text-xs font-semibold text-gray-800">
                  Requires Doctor Prescription (Schedule H / Rx Only)
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* Section 2: Initial Batch Details (Shown for new items) */}
        {!isEditMode && (
          <Card title="2. Initial Batch Information" subtitle="First lot registration for FEFO tracking">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Batch Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BAT-2601"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mfg Date
                </label>
                <input
                  type="date"
                  required
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Barcode (EAN / UPC / QR)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="890108801122"
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={handleGenerateBarcode}
                  >
                    Auto Generate
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Section 3: Pricing & Stock Inventory */}
        <Card title="3. Pricing & Inventory Parameters" subtitle="Commercial details and stock safety thresholds">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                MRP (₹ Selling Price) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Purchase Price (₹ Cost) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              />
            </div>

            {!isEditMode && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Initial Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Minimum Stock Alert Level <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Shelf / Rack Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Rack A - Shelf 2"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => navigate('/medicines')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Save className="w-4 h-4" />}
          >
            {isEditMode ? 'Update Medicine' : 'Save Medicine'}
          </Button>
        </div>
      </form>
    </div>
  );
};
