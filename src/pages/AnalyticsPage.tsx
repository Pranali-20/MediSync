import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Package,
  Receipt,
  IndianRupee,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';

export const AnalyticsPage: React.FC = () => {
  const { medicines, bills } = useApp();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'Today' | '7 Days' | '30 Days' | '3 Months'>('7 Days');

  // Real valuation calculations from active inventory
  const valuation = useMemo(() => {
    let cost = 0;
    let retail = 0;
    medicines.forEach((m) => {
      cost += m.totalStock * (m.purchasePrice || 0);
      retail += m.totalStock * (m.unitPrice || 0);
    });
    const potentialProfit = retail - cost;
    const margin = retail > 0 ? (potentialProfit / retail) * 100 : 0;
    return { cost, retail, potentialProfit, margin };
  }, [medicines]);

  // Aggregate genuine sales by item from real bills
  const salesByItem = useMemo(() => {
    const itemMap: Record<string, { name: string; unitsSold: number; revenue: number; category: string }> = {};

    bills.forEach((b) => {
      b.items.forEach((it) => {
        const medKey = String(it.medicineId || it.medicine || it.medicineName || 'item');
        if (!itemMap[medKey]) {
          itemMap[medKey] = {
            name: it.medicineName,
            unitsSold: 0,
            revenue: 0,
            category: 'Pharmacy Item',
          };
        }
        itemMap[medKey].unitsSold += it.quantity || 0;
        itemMap[medKey].revenue += it.total || it.subtotal || 0;
      });
    });

    return Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
  }, [bills]);

  // Real sales chart points
  const salesChartData = useMemo(() => {
    if (bills.length === 0) return [];
    return bills.map((b, idx) => ({
      label: `Bill #${idx + 1}`,
      sales: b.totalAmount,
      subtotal: b.subtotal,
    }));
  }, [bills]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Analytics</h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-0.5">
            Operational sales velocity, inventory asset valuation, and transaction metrics.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium text-gray-600">
          {(['Today', '7 Days', '30 Days', '3 Months'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === range
                  ? 'bg-white text-pharmagreen-800 font-semibold shadow-xs'
                  : 'hover:text-gray-900'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPI Cards (Genuine Stock Valuation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Retail Inventory Value"
          value={`₹${valuation.retail.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle="Estimated market sales value"
          icon={<IndianRupee className="w-5 h-5 text-pharmagreen-700" />}
          variant="success"
        />

        <StatCard
          title="Stock Purchase Cost"
          value={`₹${valuation.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle="Capital tied in current inventory"
          icon={<Package className="w-5 h-5 text-gray-700" />}
        />

        <StatCard
          title="Potential Gross Margin"
          value={`${valuation.margin.toFixed(1)}%`}
          subtitle={`₹${valuation.potentialProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} projected gross profit`}
          icon={<TrendingUp className="w-5 h-5 text-pharmagreen-700" />}
        />

        <StatCard
          title="Bills Generated"
          value={bills.length}
          subtitle="Total transactions recorded"
          icon={<Receipt className="w-5 h-5 text-pharmagreen-700" />}
        />
      </div>

      {/* Zero Data State if No Sales */}
      {bills.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pharmagreen-50 text-pharmagreen-600 flex items-center justify-center mx-auto border border-pharmagreen-100">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Analytics will appear after you record your first sales.
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              We never populate fake financial reports or fabricated graphs. Once you generate
              prescriptions or OTC invoices at the billing counter, live revenue trends and product
              velocity will chart automatically.
            </p>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => navigate('/billing')}>
                Go to Billing / POS
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Sales Trend Chart */}
          <Card title="Sales Revenue Performance" subtitle="Transaction history based on generated invoices">
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803D" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#15803D" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F2" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#66736A' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#66736A' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val: number) => [`₹${val.toFixed(2)}`, 'Invoice Amount']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8E4',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#15803D"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top Selling Medicines */}
          <Card title="Top Selling Medicines" subtitle="Ranked by genuine invoice volume" noPadding>
            <div className="divide-y divide-gray-100 text-xs sm:text-sm">
              {salesByItem.map((item, idx) => (
                <div key={item.name} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-pharmagreen-50 text-pharmagreen-800 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <p className="text-xs text-brand-muted">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">₹{item.revenue.toFixed(2)}</div>
                    <div className="text-xs text-pharmagreen-700 font-medium">{item.unitsSold} units sold</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
