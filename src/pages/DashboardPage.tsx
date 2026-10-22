import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  AlertTriangle,
  ClockAlert,
  IndianRupee,
  Plus,
  Receipt,
  Truck,
  Sparkles,
  ArrowRight,
  PackageCheck,
  CheckCircle2,
  Users,
  FileText,
  Boxes,
  Clock,
  Building2,
  Store,
  Layers,
  ShoppingBag,
  RotateCcw,
  ScanLine,
  Eye,
  RefreshCw,
  Check,
  Calendar,
  ChevronRight,
  ShieldCheck,
  PackageX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { aiApi } from '../services/extraApis';
import { AIRecommendation } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DashboardPage: React.FC = () => {
  const { user, pharmacyType, isHospital, isRetail, isHybrid, token } = useAuth();
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState<any>(null);
  const [topRecommendation, setTopRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      if (token) {
        const res = await fetch(`${API_BASE_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setSummaryData(json.data);
        } else {
          setError(json.message || 'Unable to load dashboard data.');
        }

        // Fetch AI recommendations
        try {
          const aiRes = await aiApi.getInsights();
          if (aiRes && aiRes.recommendations && aiRes.recommendations.length > 0) {
            setTopRecommendation(aiRes.recommendations[0]);
          } else {
            setTopRecommendation(null);
          }
        } catch {
          setTopRecommendation(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError('Unable to reach server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token, pharmacyType]);

  const inv = summaryData?.inventory || {};
  const today = summaryData?.todaySummary || {};
  const retailToday = today?.retail || {};
  const hospitalToday = today?.hospital || {};
  const recentTx = summaryData?.recentTransactions || [];
  const lowStockItems = inv?.lowStockMedicines || [];
  const expiringItems = inv?.expiringBatchesList || [];
  const pendingOrders = today?.pendingOrdersList || [];

  const typeConfig = {
    hospital: { label: 'Hospital Dispensary', icon: Building2 },
    retail: { label: 'Retail Counter', icon: Store },
    hybrid: { label: 'Hybrid Unified Ops', icon: Layers },
  };

  const currentMode = typeConfig[pharmacyType] || typeConfig.retail;
  const ModeIcon = currentMode.icon;

  // Consolidate Action Required items
  const actionItems: Array<{
    id: string;
    type: 'critical_stock' | 'low_stock' | 'expired' | 'near_expiry' | 'pending_po' | 'pending_rx';
    title: string;
    description: string;
    badge: { label: string; color: string };
    actionText: string;
    onAction: () => void;
  }> = [];

  // 1. Critical and Low stock items
  lowStockItems.slice(0, 2).forEach((item: any) => {
    if (item.totalStock === 0) {
      actionItems.push({
        id: `out-${item._id}`,
        type: 'critical_stock',
        title: item.name,
        description: `Out of stock (0 units remaining)`,
        badge: { label: 'Critical Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' },
        actionText: 'Reorder Now',
        onAction: () => navigate('/purchases'),
      });
    } else {
      actionItems.push({
        id: `low-${item._id}`,
        type: 'low_stock',
        title: item.name,
        description: `Only ${item.totalStock} ${item.unit || 'units'} left (Alert threshold: ${item.minStockAlert})`,
        badge: { label: 'Low Stock', color: 'bg-amber-100 text-amber-800 border-amber-200' },
        actionText: 'Reorder',
        onAction: () => navigate('/purchases'),
      });
    }
  });

  // 2. Expiring items
  expiringItems.slice(0, 2).forEach((batch: any) => {
    const isExpired = batch.daysRemaining < 0;
    actionItems.push({
      id: `exp-${batch._id}`,
      type: isExpired ? 'expired' : 'near_expiry',
      title: `${batch.medicineName} (Lot #${batch.batchNumber})`,
      description: isExpired
        ? `Expired ${Math.abs(batch.daysRemaining)} days ago (${batch.quantity} units)`
        : `Expires in ${batch.daysRemaining} days (${batch.quantity} units)`,
      badge: isExpired
        ? { label: 'Already Expired', color: 'bg-red-100 text-red-800 border-red-200' }
        : { label: 'Expiring Soon', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      actionText: 'View Batch',
      onAction: () => navigate('/expiry'),
    });
  });

  // 3. Pending POs
  pendingOrders.slice(0, 1).forEach((po: any) => {
    actionItems.push({
      id: `po-${po._id}`,
      type: 'pending_po',
      title: `Purchase Order #${po.orderNumber}`,
      description: `Awaiting delivery from ${po.supplierName || 'Distributor'}`,
      badge: { label: 'Awaiting Delivery', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      actionText: 'Receive Stock',
      onAction: () => navigate('/purchases'),
    });
  });

  // If Error state
  if (error && !summaryData) {
    return (
      <div className="bg-white rounded-xl border border-brand-border p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">Unable to Load Dashboard Data</h3>
          <p className="text-xs text-brand-muted mt-1 leading-relaxed">{error}</p>
        </div>
        <Button variant="primary" size="sm" onClick={fetchDashboard} icon={<RefreshCw className="w-4 h-4" />}>
          Retry Connecting
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. CLEAN PHARMACIST HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-brand-border shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Pharmacist'} 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pharmagreen-50 text-pharmagreen-800 border border-pharmagreen-200 flex items-center gap-1.5">
              <ModeIcon className="w-3.5 h-3.5 text-pharmagreen-700" />
              {currentMode.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-brand-muted mt-1">
            Here's what needs your attention today in your pharmacy.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs text-gray-600"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. QUICK ACTIONS SECTION */}
      <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-pharmagreen-600" />
            Quick Actions
          </h2>
          <span className="text-[11px] text-gray-400">Common pharmacy operations</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Button
            variant="primary"
            size="md"
            icon={<Receipt className="w-4 h-4" />}
            onClick={() => navigate('/billing')}
            className="w-full justify-center text-xs font-bold py-2.5 shadow-xs"
          >
            + New Sale (POS)
          </Button>

          <Button
            variant="outline"
            size="md"
            icon={<ScanLine className="w-4 h-4 text-gray-500" />}
            onClick={() => navigate('/scanner')}
            className="w-full justify-center text-xs font-semibold py-2.5 bg-[#FAFBFB] hover:bg-gray-100"
          >
            Scan Medicine
          </Button>

          {isHospital || isHybrid ? (
            <Button
              variant="outline"
              size="md"
              icon={<FileText className="w-4 h-4 text-purple-600" />}
              onClick={() => navigate('/prescriptions')}
              className="w-full justify-center text-xs font-semibold py-2.5 bg-[#FAFBFB] hover:bg-gray-100"
            >
              Prescriptions
            </Button>
          ) : (
            <Button
              variant="outline"
              size="md"
              icon={<Users className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate('/suppliers')}
              className="w-full justify-center text-xs font-semibold py-2.5 bg-[#FAFBFB] hover:bg-gray-100"
            >
              Suppliers
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            icon={<ShoppingBag className="w-4 h-4 text-pharmagreen-700" />}
            onClick={() => navigate('/purchases')}
            className="w-full justify-center text-xs font-semibold py-2.5 bg-[#FAFBFB] hover:bg-gray-100"
          >
            Add Stock / PO
          </Button>
        </div>
      </div>

      {/* 3. SIMPLE 5-CARD OPERATIONAL KPI ROW */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Today's Operational Snapshot
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* KPI 1: Today's Sales */}
          <div
            onClick={() => navigate('/billing')}
            className="bg-white rounded-xl border border-brand-border p-3.5 shadow-2xs hover:border-pharmagreen-500 transition-all cursor-pointer group space-y-1"
          >
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span className="font-semibold text-gray-600">Today's Sales</span>
              <IndianRupee className="w-4 h-4 text-pharmagreen-700" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-gray-900">
              ₹{(retailToday.salesRevenue || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-brand-muted flex items-center justify-between pt-0.5">
              <span>{retailToday.invoiceCount || 0} invoices</span>
              <span className="text-pharmagreen-700 font-semibold group-hover:underline">View →</span>
            </div>
          </div>

          {/* KPI 2: Medicines in Stock */}
          <div
            onClick={() => navigate('/inventory')}
            className="bg-white rounded-xl border border-brand-border p-3.5 shadow-2xs hover:border-pharmagreen-500 transition-all cursor-pointer group space-y-1"
          >
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span className="font-semibold text-gray-600">Total Stock</span>
              <Boxes className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-gray-900">
              {(inv.totalStockUnits || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-brand-muted flex items-center justify-between pt-0.5">
              <span>{inv.totalMedicines || 0} catalog items</span>
              <span className="text-pharmagreen-700 font-semibold group-hover:underline">View →</span>
            </div>
          </div>

          {/* KPI 3: Low Stock Warnings */}
          <div
            onClick={() => navigate('/inventory')}
            className="bg-white rounded-xl border border-brand-border p-3.5 shadow-2xs hover:border-amber-500 transition-all cursor-pointer group space-y-1"
          >
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span className="font-semibold text-gray-600">Low Stock</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-900">
              {(inv.lowStockCount || 0) + (inv.outOfStockCount || 0)}
            </div>
            <div className="text-[11px] text-brand-muted flex items-center justify-between pt-0.5">
              <span>{inv.outOfStockCount || 0} out of stock</span>
              <span className="text-amber-700 font-semibold group-hover:underline">View →</span>
            </div>
          </div>

          {/* KPI 4: Expiring Soon */}
          <div
            onClick={() => navigate('/expiry')}
            className="bg-white rounded-xl border border-brand-border p-3.5 shadow-2xs hover:border-rose-500 transition-all cursor-pointer group space-y-1"
          >
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span className="font-semibold text-gray-600">Expiring Soon</span>
              <ClockAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-900">
              {(inv.nearExpiryCount || 0) + (inv.expiredCount || 0)}
            </div>
            <div className="text-[11px] text-brand-muted flex items-center justify-between pt-0.5">
              <span>{inv.expiredCount || 0} already expired</span>
              <span className="text-rose-700 font-semibold group-hover:underline">View →</span>
            </div>
          </div>

          {/* KPI 5: Pending Orders / Prescriptions */}
          <div
            onClick={() => navigate(isHospital ? '/prescriptions' : '/purchases')}
            className="bg-white rounded-xl border border-brand-border p-3.5 shadow-2xs hover:border-purple-500 transition-all cursor-pointer group space-y-1"
          >
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span className="font-semibold text-gray-600">
                {isHospital ? 'Pending Rx' : 'Pending POs'}
              </span>
              {isHospital ? <FileText className="w-4 h-4 text-purple-600" /> : <Truck className="w-4 h-4 text-purple-600" />}
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-gray-900">
              {isHospital ? (hospitalToday.pendingPrescriptionsCount || 0) : (today.pendingPOsCount || 0)}
            </div>
            <div className="text-[11px] text-brand-muted flex items-center justify-between pt-0.5">
              <span>{isHospital ? 'Inpatient queue' : 'Awaiting delivery'}</span>
              <span className="text-purple-700 font-semibold group-hover:underline">View →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 🚨 ACTION REQUIRED SECTION (TOP PHARMACIST PRIORITY) */}
      <div className="bg-white rounded-xl border border-brand-border p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-brand-border/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Action Required</h2>
              <p className="text-[11px] text-brand-muted">Urgent inventory items and tasks needing pharmacist attention</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
            {actionItems.length} {actionItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {actionItems.length === 0 ? (
          <div className="py-6 text-center space-y-1.5 bg-emerald-50/40 rounded-lg border border-emerald-100/80">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-pharmagreen-700 flex items-center justify-center mx-auto">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-emerald-900">✓ Everything looks good</div>
            <p className="text-[11px] text-brand-muted">No urgent inventory actions or stockout warnings required right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-[#FAFBFB] rounded-lg border border-brand-border flex flex-col justify-between space-y-3 hover:border-gray-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.badge.color}`}>
                      {item.badge.label}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-xs mt-2 line-clamp-1">{item.title}</h3>
                  <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-2 border-t border-brand-border/60 flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={item.onAction}
                    className="text-xs font-bold py-1 px-3"
                  >
                    {item.actionText} →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. 2-COLUMN OPERATIONAL DRILLDOWN: LOW STOCK & EXPIRY SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SECTION A: Low Stock Medicines */}
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Low Stock Medicines</h3>
                  <p className="text-[11px] text-brand-muted">Items at or below minimum threshold</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="text-xs font-semibold text-pharmagreen-700 hover:text-pharmagreen-800"
              >
                View All Inventory →
              </button>
            </div>

            <div className="pt-2 space-y-2">
              {lowStockItems.length === 0 ? (
                <div className="py-8 text-center space-y-1.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-pharmagreen-700 flex items-center justify-center mx-auto">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-gray-800">✓ Stock looks good</div>
                  <p className="text-[11px] text-brand-muted">No medicines currently require restocking.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAF9] text-gray-600 font-semibold border-b border-brand-border text-[11px]">
                      <tr>
                        <th className="px-3 py-2">Medicine</th>
                        <th className="px-3 py-2">Stock</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {lowStockItems.slice(0, 4).map((item: any) => (
                        <tr key={item._id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-gray-900 line-clamp-1">{item.name}</div>
                            <div className="text-[10px] text-brand-muted font-mono">{item.genericName}</div>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-gray-900">
                            {item.totalStock} {item.unit || 'units'}
                          </td>
                          <td className="px-3 py-2.5">
                            {item.totalStock === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                                Critical
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Low Stock
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/purchases')}
                              className="text-[10px] px-2 py-0.5 h-auto font-bold"
                            >
                              Reorder
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="pt-1 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>Showing top {Math.min(4, lowStockItems.length)} items</span>
            <button onClick={() => navigate('/inventory')} className="text-pharmagreen-700 font-semibold hover:underline">
              Open Inventory Management →
            </button>
          </div>
        </div>

        {/* SECTION B: Expiring Soon (FEFO Priority) */}
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <ClockAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Expiring Soon (FEFO)</h3>
                  <p className="text-[11px] text-brand-muted">Batches approaching expiration date</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/expiry')}
                className="text-xs font-semibold text-pharmagreen-700 hover:text-pharmagreen-800"
              >
                View All Expiry →
              </button>
            </div>

            <div className="pt-2 space-y-2">
              {expiringItems.length === 0 ? (
                <div className="py-8 text-center space-y-1.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-pharmagreen-700 flex items-center justify-center mx-auto">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-gray-800">✓ No expiry alerts</div>
                  <p className="text-[11px] text-brand-muted">No medicine batches are approaching expiry within 60 days.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAF9] text-gray-600 font-semibold border-b border-brand-border text-[11px]">
                      <tr>
                        <th className="px-3 py-2">Medicine & Batch</th>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2">Days Left</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {expiringItems.slice(0, 4).map((batch: any) => {
                        const isExpired = batch.daysRemaining < 0;
                        const isNear = batch.daysRemaining <= 30;

                        return (
                          <tr key={batch._id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-gray-900 line-clamp-1">{batch.medicineName}</div>
                              <div className="text-[10px] text-brand-muted font-mono">Lot #{batch.batchNumber}</div>
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-gray-900">
                              {batch.quantity} units
                            </td>
                            <td className="px-3 py-2.5">
                              {isExpired ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                                  Expired ({Math.abs(batch.daysRemaining)}d ago)
                                </span>
                              ) : isNear ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                                  {batch.daysRemaining} days left
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  {batch.daysRemaining} days left
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/expiry')}
                                className="text-[10px] px-2 py-0.5 h-auto font-bold"
                              >
                                View Batch
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="pt-1 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>Enforcing First-Expiry, First-Out (FEFO) routing</span>
            <button onClick={() => navigate('/expiry')} className="text-pharmagreen-700 font-semibold hover:underline">
              Open FEFO Schedule →
            </button>
          </div>
        </div>
      </div>

      {/* 6. AI RESTOCKING RECOMMENDATION CARD (HUMANIZED & NON-INTRUSIVE) */}
      <div className="bg-white rounded-xl border border-brand-border p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-pharmagreen-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">AI Restocking Recommendation</h3>
              <p className="text-[11px] text-brand-muted">Calculated from consumption velocity and distributor delivery times</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/ai-insights')}
            className="text-xs font-semibold text-pharmagreen-700 hover:text-pharmagreen-800"
          >
            All AI Insights →
          </button>
        </div>

        {topRecommendation ? (
          <div className="bg-emerald-50/40 rounded-xl border border-emerald-200/80 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{topRecommendation.medicineName}</span>
                <span className="text-xs text-brand-muted font-mono">({topRecommendation.genericName})</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  {topRecommendation.priority} Priority
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                Stock may run out in approximately <strong>~{topRecommendation.coverageDays || '4 days'}</strong> based on current daily consumption.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                <span>Current stock: <strong className="text-gray-900">{topRecommendation.usableStock} units</strong></span>
                <span>Expected usage: <strong className="text-gray-900">~{topRecommendation.dailyUsage} units/day</strong></span>
                <span>Recommended order: <strong className="text-pharmagreen-800">{topRecommendation.recommendedReorderQty} units</strong></span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => navigate('/purchases')}
              className="text-xs font-bold shrink-0 py-2 px-4 shadow-xs"
            >
              Create Purchase Order ({topRecommendation.recommendedReorderQty} units)
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center space-y-1.5 bg-[#FAFBFB] rounded-lg border border-brand-border">
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-pharmagreen-700 flex items-center justify-center mx-auto">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-gray-800">✓ Inventory looks healthy</div>
            <p className="text-[11px] text-brand-muted">No urgent AI reorder recommendations at this time.</p>
          </div>
        )}
      </div>

      {/* 7. TODAY'S OPERATIONS SUMMARY & RECENT LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Operations Breakdown */}
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-brand-border/60">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Today's Operations</h3>
            <p className="text-[11px] text-brand-muted">Daily transaction counts</p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-[#FAFBFB] rounded-lg border border-brand-border flex items-center justify-between">
              <span className="text-gray-600">Counter Sales Completed</span>
              <span className="font-bold text-gray-900 font-mono text-sm">{retailToday.invoiceCount || 0}</span>
            </div>
            <div className="p-2.5 bg-[#FAFBFB] rounded-lg border border-brand-border flex items-center justify-between">
              <span className="text-gray-600">Medication Units Sold</span>
              <span className="font-bold text-pharmagreen-800 font-mono text-sm">{retailToday.unitsSold || 0}</span>
            </div>
            {isHospital || isHybrid ? (
              <div className="p-2.5 bg-[#FAFBFB] rounded-lg border border-brand-border flex items-center justify-between">
                <span className="text-gray-600">Prescriptions Dispensed</span>
                <span className="font-bold text-purple-800 font-mono text-sm">{hospitalToday.dispensedPrescriptionsCount || 0}</span>
              </div>
            ) : null}
            <div className="p-2.5 bg-[#FAFBFB] rounded-lg border border-brand-border flex items-center justify-between">
              <span className="text-gray-600">Pending Purchase Orders</span>
              <span className="font-bold text-amber-800 font-mono text-sm">{today.pendingPOsCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Ledger (2 Columns Span) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-brand-border p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-pharmagreen-600" />
                Recent Activity
              </h3>
              <p className="text-[11px] text-brand-muted">Latest stock movements and system records</p>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-pharmagreen-700 hover:text-pharmagreen-800"
            >
              Full Ledger →
            </button>
          </div>

          {recentTx.length === 0 ? (
            <div className="py-8 text-center text-xs text-brand-muted">
              No recent activity available. Complete sales, dispensing, or purchase orders to populate the ledger.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-gray-600 font-semibold border-b border-brand-border text-[11px]">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {recentTx.slice(0, 4).map((tx: any, idx: number) => (
                    <tr key={tx._id || idx} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-brand-muted font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-900">{tx.medicineName}</td>
                      <td className="px-3 py-2 font-bold font-mono text-pharmagreen-800">
                        {['PURCHASE', 'ADJUSTMENT_IN', 'RETURN'].includes(tx.type) ? `+${tx.quantity}` : `-${tx.quantity}`}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-xs">{tx.reason || 'Operation'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
