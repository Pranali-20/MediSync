import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  PackageX,
  ClockAlert,
  Search,
  Filter,
  Plus,
  ArrowRight,
  History,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import { inventoryApi } from '../services/inventoryApi';
import { Medicine, Batch, InventoryTransaction } from '../types';

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  const [inventoryList, setInventoryList] = useState<Medicine[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Adjust Stock Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_OUT');
  const [adjustQuantity, setAdjustQuantity] = useState(1);
  const [adjustReason, setAdjustReason] = useState('Stock Correction');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [invRes, txRes] = await Promise.all([
        inventoryApi.getInventory({ status: statusFilter !== 'All' ? statusFilter : undefined }),
        inventoryApi.getTransactions({ limit: 100 }),
      ]);
      setInventoryList(invRes || []);
      setTransactions(txRes?.data?.transactions || txRes?.transactions || []);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [statusFilter]);

  const filteredMedicines = useMemo(() => {
    return inventoryList.filter((m) => {
      const term = searchTerm.toLowerCase();
      return (
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.genericName.toLowerCase().includes(term) ||
        (m.barcode && m.barcode.includes(term)) ||
        (m.batches && m.batches.some((b) => b.batchNumber.toLowerCase().includes(term)))
      );
    });
  }, [inventoryList, searchTerm]);

  // Selected med batches for adjustment modal
  const selectedMed = useMemo(() => {
    return inventoryList.find((m) => (m._id || m.id) === selectedMedId);
  }, [inventoryList, selectedMedId]);

  const handleOpenAdjust = (med?: Medicine) => {
    if (med) {
      setSelectedMedId((med._id || med.id) as string);
      if (med.batches && med.batches.length > 0) {
        setSelectedBatchId((med.batches[0]._id || med.batches[0].id) as string);
      } else {
        setSelectedBatchId('');
      }
    } else {
      setSelectedMedId('');
      setSelectedBatchId('');
    }
    setAdjustType('ADJUSTMENT_OUT');
    setAdjustQuantity(1);
    setAdjustReason('Stock Correction');
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId || !selectedBatchId || adjustQuantity <= 0) {
      showToast('Fields Required', 'Please select medicine, batch, and enter quantity.', 'warning');
      return;
    }

    setSubmittingAdjust(true);
    setFeedback(null);
    try {
      await inventoryApi.adjustStock({
        medicineId: selectedMedId,
        batchId: selectedBatchId,
        type: adjustType,
        quantity: Number(adjustQuantity),
        reason: adjustReason,
        notes: adjustNotes,
      });

      setFeedback({ type: 'success', text: 'Stock adjusted and recorded in inventory audit ledger.' });
      showToast('Stock Adjusted', 'Inventory stock adjusted and recorded in audit ledger.', 'success');
      setShowAdjustModal(false);
      fetchInventoryData();
    } catch (err: any) {
      const msg = err?.toString() || 'Failed to adjust stock.';
      setFeedback({ type: 'error', text: msg });
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Stats calculation
  const totalUnits = inventoryList.reduce((sum, m) => sum + (m.totalStock || 0), 0);
  const lowStockCount = inventoryList.filter((m) => (m.usableStock || m.totalStock) <= (m.minStockAlert || 20) && (m.usableStock || m.totalStock) > 0).length;
  const outOfStockCount = inventoryList.filter((m) => (m.totalStock || 0) === 0).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Boxes className="w-6 h-6 text-pharmagreen-600" />
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Monitor usable vs damaged stock, adjust counts with audit reasons, and review transaction movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Sliders className="w-4 h-4" />}
            onClick={() => handleOpenAdjust()}
            className="text-xs"
          >
            Adjust Stock
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/purchases')}
            className="text-xs"
          >
            + Restock / Purchase
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-gray-800"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Total Stock Volume</span>
          <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
            {totalUnits.toLocaleString()} <span className="text-xs font-normal text-gray-500">units</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Across {inventoryList.length} products</span>
        </Card>

        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Low Stock Alert</span>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">{lowStockCount}</div>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Below reorder point</span>
        </Card>

        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Out of Stock</span>
          <div className="text-xl font-bold text-red-700 mt-1 font-mono">{outOfStockCount}</div>
          <span className="text-[10px] text-red-600 mt-0.5 block">Zero units remaining</span>
        </Card>

        <Card className="p-3.5 bg-white border border-brand-border">
          <span className="text-[11px] text-brand-muted font-medium block">Audit Movements</span>
          <div className="text-xl font-bold text-gray-900 mt-1 font-mono">{transactions.length}</div>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Recorded ledger entries</span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'inventory' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          Stock Inventory ({inventoryList.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'transactions' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          Transaction History Ledger ({transactions.length})
        </button>
      </div>

      {/* TAB 1: STOCK INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-brand-border p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search medicine, generic, batch, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAF9] border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-brand-muted flex items-center gap-1"><Filter className="w-3 h-3" /> Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              >
                <option value="All">All Stock Levels</option>
                <option value="Low">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-brand-muted">Loading inventory balances...</div>
          ) : filteredMedicines.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
              <EmptyState
                title="No Medicines in Inventory"
                description="Create master medicine records and add batches to track your inventory."
                actionText="+ Add First Medicine"
                onAction={() => navigate('/medicines/add')}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-3">Medicine Master</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Total Stock</th>
                      <th className="px-4 py-3">Usable Stock</th>
                      <th className="px-4 py-3">Damaged / Expired</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {filteredMedicines.map((med) => {
                      const total = med.totalStock || 0;
                      const usable = med.usableStock !== undefined ? med.usableStock : total;
                      const damaged = (med.damagedStock || 0) + (med.expiredStock || 0);

                      return (
                        <tr key={med._id || med.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{med.name}</div>
                            <div className="text-[11px] text-brand-muted font-mono">{med.genericName} ({med.dosageForm})</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{med.category}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">
                            {total} {med.unit || 'units'}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-pharmagreen-800">
                            {usable} units
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-500">
                            {damaged > 0 ? (
                              <span className="text-red-700 font-bold">-{damaged} units</span>
                            ) : (
                              '0 units'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {total === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">OUT OF STOCK</span>
                            ) : usable <= (med.minStockAlert || 20) ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">LOW STOCK</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">IN STOCK</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAdjust(med)}
                                className="text-[11px] py-1 px-2.5"
                              >
                                Adjust
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => navigate(`/medicines/${med._id || med.id}`)}
                                className="text-[11px] py-1 px-2.5"
                              >
                                View Batches
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRANSACTION HISTORY LEDGER */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-pharmagreen-600" />
              Complete Inventory Transaction Ledger
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              Audit log of all stock receipts, POS sales, hospital dispensing, customer returns, and manual adjustments.
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
              No inventory transactions recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3">Batch Lot</th>
                      <th className="px-4 py-3">Quantity Delta</th>
                      <th className="px-4 py-3">Stock Before / After</th>
                      <th className="px-4 py-3">Reason / Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {transactions.map((tx) => {
                      const isAddition = ['PURCHASE', 'ADJUSTMENT_IN', 'RETURN'].includes(tx.type);

                      return (
                        <tr key={tx._id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-brand-muted font-mono">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'PURCHASE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : tx.type === 'SALE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tx.type === 'PRESCRIPTION_DISPENSING'
                                  ? 'bg-purple-100 text-purple-800'
                                  : tx.type === 'RETURN'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{tx.medicineName}</td>
                          <td className="px-4 py-3 font-mono text-gray-700">{tx.batchNumber || 'N/A'}</td>
                          <td className="px-4 py-3 font-mono font-bold">
                            <span className={isAddition ? 'text-emerald-700 flex items-center gap-0.5' : 'text-red-700 flex items-center gap-0.5'}>
                              {isAddition ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {isAddition ? '+' : '-'}{tx.quantity} units
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600">
                            {tx.previousStock} → {tx.newStock}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {tx.reason || tx.reference || 'Operational Event'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {showAdjustModal && (
        <Modal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          title="Manual Stock Adjustment & Audit Correction"
          maxWidth="md"
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Select Medicine *</label>
              <select
                required
                value={selectedMedId}
                onChange={(e) => {
                  setSelectedMedId(e.target.value);
                  const m = inventoryList.find((x) => (x._id || x.id) === e.target.value);
                  if (m && m.batches && m.batches.length > 0) {
                    setSelectedBatchId((m.batches[0]._id || m.batches[0].id) as string);
                  } else {
                    setSelectedBatchId('');
                  }
                }}
                className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              >
                <option value="">-- Choose Medicine --</option>
                {inventoryList.map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.name} ({m.genericName} - Stock: {m.totalStock})
                  </option>
                ))}
              </select>
            </div>

            {selectedMed && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Select Batch / Lot *</label>
                <select
                  required
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                >
                  <option value="">-- Choose Batch --</option>
                  {(selectedMed.batches || []).map((b) => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      #{b.batchNumber} (Current Qty: {b.quantity}, Exp: {new Date(b.expiryDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Adjustment Direction</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                >
                  <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (Reduce Stock)</option>
                  <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (Increase Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Quantity Units *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 font-bold text-center focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Reason for Adjustment *</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              >
                <option value="Stock Correction">Stock Correction (Audit Discrepancy)</option>
                <option value="Damaged">Damaged / Broken Bottle / Broken Seal</option>
                <option value="Expired">Expired Stock Write-Off</option>
                <option value="Lost">Lost / Pilferage</option>
                <option value="Sample">Doctor Sample / Demo</option>
                <option value="Other">Other Operational Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Audit Notes</label>
              <textarea
                rows={2}
                placeholder="Provide context for the adjustment (e.g. Physical inventory count verified by Dr. Roy)"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              />
            </div>

            <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAdjustModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submittingAdjust}>
                Submit Stock Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default InventoryPage;
