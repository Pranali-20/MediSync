import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pill,
  QrCode,
  PackageCheck,
  Calendar,
  Layers,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { medicineApi } from '../services/medicineApi';
import { supplierApi } from '../services/extraApis';
import { Medicine, Batch, Supplier } from '../types';

export const MedicineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Batch modal state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newQuantity, setNewQuantity] = useState(100);
  const [newPurchasePrice, setNewPurchasePrice] = useState('20');
  const [newSellingPrice, setNewSellingPrice] = useState('35');
  const [newSupplierId, setNewSupplierId] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [medRes, supRes] = await Promise.all([
        medicineApi.getMedicineById(id),
        supplierApi.getSuppliers(),
      ]);
      setMedicine(medRes);
      setSuppliers(supRes || []);

      if (medRes) {
        setNewPurchasePrice(String(medRes.purchasePrice || 20));
        setNewSellingPrice(String(medRes.sellingPrice || 35));
      }
    } catch (err: any) {
      console.error('Failed to load medicine details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleOpenAddBatch = () => {
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 2);

    setNewBatchNo(`LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewMfgDate(today.toISOString().split('T')[0]);
    setNewExpDate(nextYear.toISOString().split('T')[0]);
    setNewQuantity(medicine?.reorderQuantity || 100);
    setShowAddBatch(true);
  };

  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || !id) return;

    setSubmittingBatch(true);
    setFeedback(null);

    try {
      await medicineApi.addBatchToMedicine(id, {
        batchNumber: newBatchNo,
        quantity: Number(newQuantity),
        purchasePrice: Number(newPurchasePrice),
        sellingPrice: Number(newSellingPrice),
        manufacturingDate: newMfgDate,
        expiryDate: newExpDate,
        supplierId: newSupplierId || undefined,
      });

      setFeedback({ type: 'success', text: `Batch ${newBatchNo} added successfully! Medicine stock increased.` });
      setShowAddBatch(false);
      fetchDetails();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.toString() || 'Failed to add batch.' });
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleDeleteMedicine = async () => {
    if (!medicine || !id) return;
    try {
      await medicineApi.deleteMedicine(id);
      navigate('/medicines');
    } catch (err) {
      alert('Failed to delete medicine.');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-xs text-brand-muted">Loading medicine record and batches...</div>;
  }

  if (!medicine) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-gray-800">Medicine Not Found</h2>
        <p className="text-xs text-brand-muted mt-1">The requested medicine record does not exist.</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/medicines')}>
          Back to Medicines
        </Button>
      </div>
    );
  }

  const sellP = medicine.sellingPrice || medicine.unitPrice || 0;
  const purP = medicine.purchasePrice || 0;
  const profitMargin = sellP > 0
    ? (((sellP - purP) / sellP) * 100).toFixed(1)
    : '0';

  const batches = medicine.batches || [];
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Back & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/medicines')}
            className="p-2 rounded-lg border border-brand-border bg-white text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-brand-text">{medicine.name}</h1>
              {medicine.prescriptionRequired && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  Rx Required
                </span>
              )}
            </div>
            <p className="text-xs text-brand-muted mt-0.5 font-mono">
              Generic: {medicine.genericName} • Category: {medicine.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAddBatch}
            className="text-xs"
          >
            + Add New Batch
          </Button>
          <Button
            variant="soft-danger"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => setShowDeleteModal(true)}
            className="text-xs"
          >
            Delete
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Total Stock In Hand</span>
          <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
            {medicine.totalStock} <span className="text-xs font-normal text-gray-500">{medicine.unit || 'Units'}</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Aggregated across {batches.length} batches</span>
        </Card>

        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Active Batches</span>
          <div className="text-xl font-bold text-pharmagreen-700 mt-1 font-mono">
            {batches.filter((b) => b.quantity > 0).length} <span className="text-xs font-normal text-gray-500">Available</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">FEFO managed</span>
        </Card>

        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Default Selling MRP</span>
          <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
            ₹{medicine.sellingPrice?.toFixed(2)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Margin: ~{profitMargin}%</span>
        </Card>

        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Reorder Threshold</span>
          <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
            {medicine.minStockAlert} <span className="text-xs font-normal text-gray-500">units</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Reorder size: {medicine.reorderQuantity}</span>
        </Card>
      </div>

      {/* MASTER DATA DETAILS */}
      <div className="bg-white rounded-xl border border-brand-border p-5 space-y-4 shadow-2xs">
        <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-pharmagreen-600" />
          Permanent Master Product Details
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-brand-muted block">Dosage Form & Strength</span>
            <span className="font-semibold text-gray-900">{medicine.dosageForm} ({medicine.strength})</span>
          </div>
          <div>
            <span className="text-[11px] text-brand-muted block">Manufacturer</span>
            <span className="font-semibold text-gray-900">{medicine.manufacturer || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[11px] text-brand-muted block">Storage Location</span>
            <span className="font-semibold text-gray-900">{medicine.location || 'Main Shelf'}</span>
          </div>
          <div>
            <span className="text-[11px] text-brand-muted block">Barcode / EAN</span>
            <span className="font-mono text-gray-700">{medicine.barcode || 'None Assigned'}</span>
          </div>
        </div>
      </div>

      {/* BATCHES BREAKDOWN IN FEFO ORDER */}
      <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs space-y-0">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-pharmagreen-600" />
              Batch Inventory Ledger (FEFO Sorted)
            </h2>
            <p className="text-[11px] text-brand-muted mt-0.5">
              Batches expiring first are automatically prioritized for sales and dispensing.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenAddBatch}
            className="text-xs"
          >
            Add Batch
          </Button>
        </div>

        {sortedBatches.length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-muted">
            No batches currently registered for this medicine. Click <strong>"+ Add New Batch"</strong> to add incoming inventory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                <tr>
                  <th className="px-4 py-3">FEFO Priority</th>
                  <th className="px-4 py-3">Batch / Lot #</th>
                  <th className="px-4 py-3">Quantity Available</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Days Remaining</th>
                  <th className="px-4 py-3">Purchase Cost</th>
                  <th className="px-4 py-3">Selling MRP</th>
                  <th className="px-4 py-3">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {sortedBatches.map((batch, idx) => {
                  const now = new Date();
                  const exp = new Date(batch.expiryDate);
                  const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = days < 0;
                  const isNearExpiry = days >= 0 && days <= 60;

                  return (
                    <tr key={batch._id || batch.id || idx} className={`hover:bg-slate-50/70 ${isExpired ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        {idx === 0 && batch.quantity > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            1st in FEFO
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {batch.batchNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold font-mono ${batch.quantity === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {batch.quantity} units
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {new Date(batch.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            Expired ({Math.abs(days)}d ago)
                          </span>
                        ) : isNearExpiry ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {days} days remaining
                          </span>
                        ) : (
                          <span className="text-gray-600 font-mono">{days} days</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-800">₹{batch.purchasePrice?.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">₹{batch.sellingPrice?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-brand-muted">{batch.supplierName || 'Authorized Distributor'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD BATCH MODAL */}
      {showAddBatch && (
        <Modal
          isOpen={showAddBatch}
          onClose={() => setShowAddBatch(false)}
          title={`Add New Batch to ${medicine.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddBatchSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Batch / Lot Number *</label>
                <input
                  type="text"
                  required
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Quantity Received *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Number(e.target.value))}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 font-bold text-pharmagreen-800 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Manufacturing Date</label>
                <input
                  type="date"
                  value={newMfgDate}
                  onChange={(e) => setNewMfgDate(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Purchase Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Selling MRP (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Supplier / Distributor</label>
              <select
                value={newSupplierId}
                onChange={(e) => setNewSupplierId(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              >
                <option value="">-- Select Supplier (Optional) --</option>
                {suppliers.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-brand-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBatch(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submittingBatch}>
                Add Batch & Update Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <ConfirmDialog
          isOpen={showDeleteModal}
          title={`Delete ${medicine.name}?`}
          message="Are you sure you want to delete this medicine and all its registered batches? This cannot be undone."
          confirmText="Delete Record"
          variant="danger"
          onConfirm={handleDeleteMedicine}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};
export default MedicineDetailPage;
