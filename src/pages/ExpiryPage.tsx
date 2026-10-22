import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClockAlert,
  ShieldCheck,
  Search,
  Filter,
  Trash2,
  PackageX,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { inventoryApi } from '../services/inventoryApi';

export const ExpiryPage: React.FC = () => {
  const navigate = useNavigate();

  const [expiryData, setExpiryData] = useState<{
    expired: any[];
    within7Days: any[];
    within30Days: any[];
    within60Days: any[];
    safe: any[];
  }>({
    expired: [],
    within7Days: [],
    within30Days: [],
    within60Days: [],
    safe: [],
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<'ALL' | 'EXPIRED' | '7DAYS' | '30DAYS' | '60DAYS' | 'SAFE'>('ALL');

  const fetchExpiry = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getExpiry();
      if (res) {
        setExpiryData(res);
      }
    } catch (err) {
      console.error('Failed to load expiry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiry();
  }, []);

  const allBatches = useMemo(() => {
    const list: any[] = [];
    (expiryData.expired || []).forEach((b) => list.push({ ...b, tier: 'EXPIRED' }));
    (expiryData.within7Days || []).forEach((b) => list.push({ ...b, tier: '7DAYS' }));
    (expiryData.within30Days || []).forEach((b) => list.push({ ...b, tier: '30DAYS' }));
    (expiryData.within60Days || []).forEach((b) => list.push({ ...b, tier: '60DAYS' }));
    (expiryData.safe || []).forEach((b) => list.push({ ...b, tier: 'SAFE' }));
    return list;
  }, [expiryData]);

  const filteredBatches = useMemo(() => {
    return allBatches.filter((b) => {
      const term = searchTerm.toLowerCase();
      const medName = b.medicine?.name || b.medicineName || '';
      const matchesSearch =
        !term ||
        medName.toLowerCase().includes(term) ||
        b.batchNumber.toLowerCase().includes(term) ||
        (b.supplierName && b.supplierName.toLowerCase().includes(term));

      const matchesTier = selectedTier === 'ALL' || b.tier === selectedTier;
      return matchesSearch && matchesTier;
    });
  }, [allBatches, searchTerm, selectedTier]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <ClockAlert className="w-6 h-6 text-pharmagreen-600" />
            Batch-Level Expiry Monitoring & FEFO Tracking
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Identify exact batch numbers approaching expiration to enforce First-Expiry First-Out (FEFO) dispensing.
          </p>
        </div>
      </div>

      {/* FEFO Concept Banner */}
      <div className="p-4 rounded-xl bg-pharmagreen-50 border border-pharmagreen-200 text-pharmagreen-950 flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 rounded-lg bg-pharmagreen-600 text-white shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-[#166534]">
            First Expiry, First Out (FEFO) Engine Active
          </h4>
          <p className="text-brand-muted mt-1 leading-relaxed">
            MediSync automatically prioritizes batches with the earliest expiry dates during counter POS billing and hospital prescription dispensing, protecting patient safety and eliminating inventory wastage.
          </p>
        </div>
      </div>

      {/* 5-Tier Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setSelectedTier('EXPIRED')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'EXPIRED' ? 'bg-red-50 border-red-400 ring-1 ring-red-400' : 'bg-white border-brand-border hover:border-red-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-red-700 block">Expired</span>
          <div className="text-xl font-bold text-red-800 font-mono mt-0.5">{expiryData.expired?.length || 0}</div>
          <span className="text-[10px] text-red-600">Action: Discard / Return</span>
        </div>

        <div
          onClick={() => setSelectedTier('7DAYS')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            selectedTier === '7DAYS' ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-400' : 'bg-white border-brand-border hover:border-orange-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-orange-700 block">≤ 7 Days</span>
          <div className="text-xl font-bold text-orange-800 font-mono mt-0.5">{expiryData.within7Days?.length || 0}</div>
          <span className="text-[10px] text-orange-600">Urgent FEFO priority</span>
        </div>

        <div
          onClick={() => setSelectedTier('30DAYS')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            selectedTier === '30DAYS' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' : 'bg-white border-brand-border hover:border-amber-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-700 block">≤ 30 Days</span>
          <div className="text-xl font-bold text-amber-800 font-mono mt-0.5">{expiryData.within30Days?.length || 0}</div>
          <span className="text-[10px] text-amber-600">Monitor closely</span>
        </div>

        <div
          onClick={() => setSelectedTier('60DAYS')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            selectedTier === '60DAYS' ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-brand-border hover:border-blue-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-blue-700 block">≤ 60 Days</span>
          <div className="text-xl font-bold text-blue-800 font-mono mt-0.5">{expiryData.within60Days?.length || 0}</div>
          <span className="text-[10px] text-blue-600">Normal circulation</span>
        </div>

        <div
          onClick={() => setSelectedTier('SAFE')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'SAFE' ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400' : 'bg-white border-brand-border hover:border-emerald-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-700 block">Safe (&gt;60 Days)</span>
          <div className="text-xl font-bold text-emerald-800 font-mono mt-0.5">{expiryData.safe?.length || 0}</div>
          <span className="text-[10px] text-emerald-600">Healthy shelf life</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-brand-border p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search medicine, batch number, distributor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAF9] border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] text-brand-muted flex items-center gap-1"><Filter className="w-3 h-3" /> Tier:</span>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value as any)}
            className="text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
          >
            <option value="ALL">All Batches ({allBatches.length})</option>
            <option value="EXPIRED">Expired ({expiryData.expired?.length || 0})</option>
            <option value="7DAYS">≤ 7 Days ({expiryData.within7Days?.length || 0})</option>
            <option value="30DAYS">≤ 30 Days ({expiryData.within30Days?.length || 0})</option>
            <option value="60DAYS">≤ 60 Days ({expiryData.within60Days?.length || 0})</option>
            <option value="SAFE">Safe ({expiryData.safe?.length || 0})</option>
          </select>
        </div>
      </div>

      {/* Batches Table */}
      {loading ? (
        <div className="text-center py-16 text-xs text-brand-muted">Scanning inventory batch expiry dates...</div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
          No batches matching this filter criteria.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                <tr>
                  <th className="px-4 py-3">Medicine Master</th>
                  <th className="px-4 py-3">Batch / Lot Number</th>
                  <th className="px-4 py-3">Quantity Left</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Days Remaining</th>
                  <th className="px-4 py-3">Supplier / Distributor</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredBatches.map((batch) => {
                  const days = batch.daysRemaining;
                  const isExpired = days < 0;
                  const is7Days = days >= 0 && days <= 7;
                  const is30Days = days > 7 && days <= 30;

                  return (
                    <tr key={batch._id || batch.id} className={`hover:bg-slate-50/70 ${isExpired ? 'bg-red-50/40' : is7Days ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{batch.medicine?.name || batch.medicineName}</div>
                        <div className="text-[11px] text-brand-muted font-mono">{batch.medicine?.genericName}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {batch.batchNumber}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {batch.quantity} units
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {new Date(batch.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            Expired ({Math.abs(days)}d ago)
                          </span>
                        ) : is7Days ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                            ⚠ {days} days remaining
                          </span>
                        ) : is30Days ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {days} days remaining
                          </span>
                        ) : (
                          <span className="text-gray-600 font-mono">{days} days</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-muted">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {batch.supplierName || 'Authorized Distributor'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/medicines/${batch.medicine?._id || batch.medicineId || ''}`)}
                          className="text-[11px] py-1 px-2.5"
                        >
                          View Medicine
                        </Button>
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
  );
};
export default ExpiryPage;
