import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowRight,
  Truck,
  Layers,
  CheckCircle2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { aiApi } from '../services/extraApis';
import { AIRecommendation, SlowMovingItem, ExpiryRiskItem } from '../types';

export const AIInsightsPage: React.FC = () => {
  const navigate = useNavigate();

  const [insightsData, setInsightsData] = useState<{
    hasSufficientData: boolean;
    message?: string;
    recommendations: AIRecommendation[];
    slowMoving: SlowMovingItem[];
    expiryRisks: ExpiryRiskItem[];
    metrics?: any;
  }>({
    hasSufficientData: false,
    recommendations: [],
    slowMoving: [],
    expiryRisks: [],
  });

  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await aiApi.getInsights();
      if (res) {
        setInsightsData(res);
      }
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pharmagreen-600" />
            AI Inventory Intelligence & Restocking Decision Support
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Operational recommendations computed from daily usage velocity, supplier lead times, and batch expiration curves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={fetchInsights}
            className="text-xs"
          >
            Recalculate
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<ShoppingBag className="w-4 h-4" />}
            onClick={() => navigate('/purchases')}
            className="text-xs"
          >
            Purchases & Restocking
          </Button>
        </div>
      </div>

      {/* Advisory Guidance Notice */}
      <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
        <Sparkles className="w-4 h-4 text-pharmagreen-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-brand-muted">
          <strong className="text-gray-900 font-semibold">Decision-Support Boundary:</strong> MediSync delivers advisory inventory suggestions based strictly on historical movements and stock thresholds. The pharmacist maintains professional control and oversight over all purchasing and dispensing decisions.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs text-brand-muted">Analyzing transaction velocity and inventory curves...</div>
      ) : !insightsData.hasSufficientData ? (
        <div className="bg-white rounded-xl border border-brand-border p-12 text-center max-w-2xl mx-auto shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-pharmagreen-700 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Not Enough Historical Transaction Data</h3>
          <p className="text-xs text-brand-muted leading-relaxed">
            MediSync strictly follows the <strong>Zero Fake Data</strong> policy. We do not generate mock predictions or hallucinated demand curves. Once you record regular counter sales, hospital dispensing, or purchase deliveries, real inventory forecasting and reorder recommendations will automatically activate here.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <Button variant="primary" size="sm" onClick={() => navigate('/medicines/add')} className="text-xs">
              + Add Medicines
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/billing')} className="text-xs">
              Counter POS
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Restocking Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-pharmagreen-600" />
                  Restocking & Reorder Recommendations ({insightsData.recommendations.length})
                </h2>
                <p className="text-[11px] text-brand-muted">
                  Medicines below safety thresholds or whose remaining stock will deplete within supplier lead times.
                </p>
              </div>
            </div>

            {insightsData.recommendations.length === 0 ? (
              <div className="bg-white rounded-xl border border-brand-border p-8 text-center text-xs text-emerald-800 font-medium">
                ✓ All inventory lines are adequately stocked relative to current consumption velocity.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insightsData.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-brand-border p-4 space-y-3 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm">{rec.medicineName}</h3>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec.priority === 'Critical'
                                  ? 'bg-red-100 text-red-800'
                                  : rec.priority === 'High'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rec.priority} Priority
                            </span>
                          </div>
                          <p className="text-[11px] text-brand-muted font-mono">{rec.genericName} • {rec.category}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-brand-muted block">Usable Stock</span>
                          <span className="font-mono font-bold text-sm text-gray-900">{rec.usableStock} units</span>
                        </div>
                      </div>

                      {/* Metrics strip */}
                      <div className="grid grid-cols-3 gap-2 bg-[#F8FAF9] p-2.5 rounded-lg border border-brand-border text-[11px] mt-3">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Estimated Usage:</span>
                          <span className="font-bold text-gray-800">~{rec.dailyUsage} units/day</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Stock May Last:</span>
                          <span className="font-bold text-pharmagreen-800">~{rec.coverageDays}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Supplier Delivery Time:</span>
                          <span className="font-bold text-gray-800">{rec.supplierLeadTimeDays} days</span>
                        </div>
                      </div>

                      {/* AI Reasoning explanation */}
                      <div className="mt-2.5 text-xs text-gray-700 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100 leading-relaxed">
                        <strong className="text-emerald-900 font-semibold">Operational Analysis:</strong> {rec.reasoning}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-brand-border flex items-center justify-between text-xs">
                      <span className="text-[11px] text-brand-muted">
                        Supplier: <strong>{rec.supplierName}</strong>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ShoppingBag className="w-3.5 h-3.5" />}
                        onClick={() => navigate('/purchases')}
                        className="text-xs font-bold"
                      >
                        Create Purchase Order ({rec.recommendedReorderQty} units)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Slow-Moving Inventory */}
          {insightsData.slowMoving.length > 0 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                  Slow-Moving Inventory Warnings ({insightsData.slowMoving.length})
                </h2>
                <p className="text-[11px] text-brand-muted">
                  High quantity medicines with zero sales or dispensing movements in the past 30 days.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Stock Units Idle</th>
                      <th className="px-4 py-3">Capital Tied Up</th>
                      <th className="px-4 py-3">Suggestion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {insightsData.slowMoving.map((sm, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-bold text-gray-900">{sm.medicineName}</td>
                        <td className="px-4 py-3 text-gray-600">{sm.category}</td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{sm.usableStock} units</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-800">₹{sm.totalCapitalTied?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-700">{sm.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Expiry Risk Forecast */}
          {insightsData.expiryRisks.length > 0 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  Batch Expiry Risk Alerts ({insightsData.expiryRisks.length})
                </h2>
                <p className="text-[11px] text-brand-muted">
                  Specific batch quantities where current stock exceeds expected historical usage before the expiry date.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-3">Medicine & Batch</th>
                      <th className="px-4 py-3">Batch Stock</th>
                      <th className="px-4 py-3">Expires In</th>
                      <th className="px-4 py-3">Expected Usage Before Exp</th>
                      <th className="px-4 py-3">Potential Excess Risk</th>
                      <th className="px-4 py-3">Value at Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {insightsData.expiryRisks.map((er, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{er.medicineName}</div>
                          <div className="text-[11px] text-brand-muted font-mono">Lot #{er.batchNumber}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">{er.quantity} units</td>
                        <td className="px-4 py-3 text-red-700 font-bold font-mono">{er.daysRemaining} days</td>
                        <td className="px-4 py-3 font-mono text-gray-700">~{er.expectedUsageBeforeExpiry} units</td>
                        <td className="px-4 py-3 font-mono font-bold text-orange-700">{er.excessUnitsAtRisk} units</td>
                        <td className="px-4 py-3 font-mono font-bold text-red-800">₹{er.estimatedValueAtRisk?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AIInsightsPage;
