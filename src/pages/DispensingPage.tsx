import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  User,
  ShieldCheck,
  Building,
  Check,
  Pill,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Prescription } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DispensingPage: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dispense Form State
  const [dispenseQuantities, setDispenseQuantities] = useState<{ [itemId: string]: number }>({});
  const [verifiedByPharmacist, setVerifiedByPharmacist] = useState(false);
  const [dispensingNotes, setDispensingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);

  const fetchPendingPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/prescriptions?status=PENDING`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const list: Prescription[] = json.data?.prescriptions || [];
        setPendingPrescriptions(list);
        if (list.length > 0 && !selectedRx) {
          loadRxDetails(list[0]);
        } else if (list.length === 0) {
          setSelectedRx(null);
        }
      }
    } catch {
      showToast('Error', 'Unable to fetch prescriptions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRxDetails = async (rx: Prescription) => {
    try {
      const rxId = rx.id || (rx as any)._id;
      const res = await fetch(`${API_BASE_URL}/prescriptions/${rxId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const fullRx: Prescription = json.data;
        setSelectedRx(fullRx);

        const initialMap: { [key: string]: number } = {};
        fullRx.items.forEach((item) => {
          const remaining = Math.max(0, item.quantityPrescribed - item.quantityDispensed);
          const itemId = item._id || (item.medicine as any)?._id || (item.medicine as string);
          initialMap[itemId] = remaining;
        });
        setDispenseQuantities(initialMap);
        setVerifiedByPharmacist(false);
        setDispensingNotes('');
      }
    } catch {
      showToast('Error', 'Unable to load prescription details.', 'error');
    }
  };

  useEffect(() => {
    fetchPendingPrescriptions();
  }, []);

  const handleDispense = async () => {
    if (!selectedRx) return;
    if (!verifiedByPharmacist) {
      showToast('Verification Required', 'Please confirm that medicine and batch numbers were physically checked.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const rxId = selectedRx.id || (selectedRx as any)._id;
      const payloadItems = selectedRx.items
        .map((item) => {
          const itemId = item._id || (item.medicine as any)?._id || (item.medicine as string);
          const qty = Number(dispenseQuantities[itemId]) || 0;
          return {
            medicineId: typeof item.medicine === 'object' ? (item.medicine as any)._id : item.medicine,
            itemId: item._id,
            quantity: qty,
          };
        })
        .filter((i) => i.quantity > 0);

      if (!payloadItems.length) {
        showToast('Validation Error', 'No item quantities specified for dispensing.', 'warning');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/prescriptions/${rxId}/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemsToDispense: payloadItems,
          notes: dispensingNotes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Dispensing Complete', 'Stock deducted and prescription updated.');
        setReceipt({
          prescription: json.data.prescription,
          dispensedItems: json.data.dispensedItems,
          timestamp: new Date().toLocaleString(),
        });
        fetchPendingPrescriptions();
      } else {
        showToast('Dispense Failed', json.message || 'Error executing dispensing.', 'error');
      }
    } catch {
      showToast('Error', 'Unable to reach server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredList = pendingPrescriptions.filter((rx) => {
    const term = searchQuery.toLowerCase();
    return (
      rx.prescriptionNumber.toLowerCase().includes(term) ||
      rx.patientName.toLowerCase().includes(term) ||
      rx.doctorName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-pharmagreen-700" />
            <span>Prescription Dispensing Desk</span>
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Hospital dispensing counter: Verify patient prescriptions, check live batch lots, and execute FEFO stock deduction.
          </p>
        </div>
      </div>

      {/* Main 2-Column Dispensing Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pending Prescriptions Queue */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-brand-border p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <div className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Queue ({filteredList.length})</span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Rx # or Patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAF9] focus:bg-white text-xs pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-600"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading queue...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-brand-border rounded-lg text-xs text-brand-muted">
              No pending prescriptions in queue.
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filteredList.map((rx) => {
                const rxId = rx.id || (rx as any)._id;
                const isSelected = selectedRx && (selectedRx.id === rxId || (selectedRx as any)._id === rxId);

                return (
                  <div
                    key={rxId}
                    onClick={() => loadRxDetails(rx)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-pharmagreen-600 bg-pharmagreen-50/60 shadow-2xs'
                        : 'border-brand-border bg-[#F8FAF9] hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-gray-900">{rx.prescriptionNumber}</span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                        Pending
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-gray-900 truncate">{rx.patientName}</div>
                    <div className="text-[11px] text-brand-muted truncate">
                      Dr. {rx.doctorName} • {rx.items.length} items
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Dispensing Cockpit */}
        <div className="lg:col-span-8 space-y-4">
          {selectedRx ? (
            <div className="bg-white rounded-xl border border-brand-border p-6 space-y-5">
              {/* Prescription Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-brand-border gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      Prescription #{selectedRx.prescriptionNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                      {selectedRx.status}
                    </span>
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5">
                    Prescribed on {new Date(selectedRx.prescriptionDate).toLocaleDateString()} by{' '}
                    <strong className="text-gray-800">{selectedRx.doctorName}</strong> ({selectedRx.department})
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-brand-muted font-medium">Pharmacist Desk Mode</span>
                </div>
              </div>

              {/* Patient Profile & Safety Warning */}
              <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-brand-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-pharmagreen-100 text-pharmagreen-800 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{selectedRx.patientName}</div>
                      <div className="text-[11px] text-brand-muted">
                        MRN: {(selectedRx.patient as any)?.patientId || 'PAT'} •{' '}
                        {(selectedRx.patient as any)?.hospitalId || 'Hospital Ward'}
                      </div>
                    </div>
                  </div>

                  {(selectedRx.patient as any)?.bloodGroup && (
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                      {(selectedRx.patient as any).bloodGroup}
                    </span>
                  )}
                </div>

                {(selectedRx.patient as any)?.allergies?.length > 0 && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Patient Allergies: {(selectedRx.patient as any).allergies.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Items Table & Live FEFO Batches */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Prescribed Medication List
                </div>

                {selectedRx.items.map((item) => {
                  const itemId = item._id || (item.medicine as any)?._id || (item.medicine as string);
                  const availableStock = item.availableStock ?? 0;
                  const remainingNeeded = Math.max(0, item.quantityPrescribed - item.quantityDispensed);

                  return (
                    <div
                      key={itemId}
                      className="p-4 rounded-lg border border-brand-border bg-[#F8FAF9] space-y-3 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{item.medicineName}</div>
                          <div className="text-xs text-brand-muted mt-0.5 font-medium">
                            Dosage: {item.dosageInstructions || 'As prescribed'}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            availableStock >= remainingNeeded
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : availableStock > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {availableStock >= remainingNeeded
                            ? `In Stock (${availableStock} avail)`
                            : availableStock > 0
                            ? `Shortage (${availableStock} avail)`
                            : 'Out of Stock'}
                        </span>
                      </div>

                      {/* Batches Queue (FEFO) */}
                      {item.batches && item.batches.length > 0 ? (
                        <div className="p-2.5 rounded-md bg-white border border-brand-border space-y-1.5 font-mono text-[11px]">
                          <div className="text-[10px] font-bold text-brand-muted uppercase font-sans">
                            FEFO Lot Deduction Queue:
                          </div>
                          {item.batches.map((b) => (
                            <div key={b.id} className="flex items-center justify-between text-gray-700">
                              <span>
                                Lot #{b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()})
                              </span>
                              <span className="font-bold text-pharmagreen-700">{b.quantity} units</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-rose-600 italic">No active batches available in inventory!</div>
                      )}

                      {/* Quantity Input */}
                      <div className="pt-2 border-t border-brand-border flex items-center justify-between">
                        <div className="text-[11px] text-gray-600 font-mono">
                          Prescribed: <strong>{item.quantityPrescribed}</strong> | Already Dispensed:{' '}
                          <strong className="text-pharmagreen-700">{item.quantityDispensed}</strong> | Needed:{' '}
                          <strong className="text-gray-900">{remainingNeeded}</strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="font-semibold text-gray-700 text-xs">Dispense Now:</label>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(remainingNeeded, availableStock)}
                            value={dispenseQuantities[itemId] ?? remainingNeeded}
                            onChange={(e) =>
                              setDispenseQuantities({
                                ...dispenseQuantities,
                                [itemId]: Number(e.target.value),
                              })
                            }
                            className="w-20 bg-white p-1.5 rounded border border-brand-border text-center font-bold font-mono text-xs focus:outline-none focus:border-pharmagreen-600"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Dispensing Notes & Instructions Given to Patient
                </label>
                <input
                  type="text"
                  value={dispensingNotes}
                  onChange={(e) => setDispensingNotes(e.target.value)}
                  placeholder="e.g. Explained dosage schedule to patient, handed over with printed receipt"
                  className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                />
              </div>

              {/* Pharmacist Safety Verification */}
              <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-emerald-950 font-medium">
                  <input
                    type="checkbox"
                    checked={verifiedByPharmacist}
                    onChange={(e) => setVerifiedByPharmacist(e.target.checked)}
                    className="mt-0.5 rounded border-emerald-300 text-pharmagreen-600 focus:ring-pharmagreen-600 w-4 h-4"
                  />
                  <span>
                    <strong>Pharmacist Verification:</strong> I confirm that the medicines, dosages, lot expiration dates, and patient identity have been physically verified.
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-brand-border flex items-center justify-end">
                <Button
                  variant="primary"
                  size="md"
                  icon={<PackageCheck className="w-4 h-4" />}
                  loading={submitting}
                  disabled={!verifiedByPharmacist}
                  onClick={handleDispense}
                  className="w-full sm:w-auto text-xs"
                >
                  Deduct Stock & Complete Dispensing
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center">
              <EmptyState
                title="Select a Prescription"
                description="Choose a pending prescription from the queue on the left to review batch availability and dispense medications."
              />
            </div>
          )}
        </div>
      </div>

      {/* Dispense Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-brand-border w-full max-w-md p-6 text-xs space-y-4">
            <div className="text-center pb-3 border-b border-brand-border">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-pharmagreen-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Hospital Dispensing Voucher</h2>
              <p className="text-[11px] text-brand-muted">MediSync Pharmacy Ledger</p>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] bg-[#F8FAF9] p-3 rounded-lg border border-brand-border">
              <div className="flex justify-between">
                <span className="text-brand-muted">Rx Number:</span>
                <span className="font-bold text-gray-900">{receipt.prescription.prescriptionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Patient Name:</span>
                <span className="font-bold text-gray-900">{receipt.prescription.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Timestamp:</span>
                <span>{receipt.timestamp}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                Dispensed Medication Lots:
              </div>
              {receipt.dispensedItems.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 font-mono text-[11px]">
                  <span>{it.medicineName} (Lot #{it.batchNumber})</span>
                  <span className="font-bold text-pharmagreen-800">-{it.quantity} units</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
                className="w-1/2 text-xs"
              >
                Print Voucher
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setReceipt(null)}
                className="w-1/2 text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
