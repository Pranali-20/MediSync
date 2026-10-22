import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  PackageCheck,
  AlertCircle,
  X,
  Printer,
  ChevronRight,
  AlertTriangle,
  User,
  Pill,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Prescription, Patient, Medicine } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const PrescriptionsPage: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [dispenseModalRx, setDispenseModalRx] = useState<Prescription | null>(null);
  const [dispenseItems, setDispenseItems] = useState<{ [itemId: string]: number }>({});
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [dispensingLoading, setDispensingLoading] = useState(false);
  const [dispenseReceipt, setDispenseReceipt] = useState<any | null>(null);

  // New Rx Form
  const [newRx, setNewRx] = useState({
    patientId: '',
    doctorName: '',
    department: 'General Medicine',
    prescriptionDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [{ medicine: '', dosageInstructions: '1 tablet twice daily after meals for 5 days', quantityPrescribed: 10 }],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const rxParams = new URLSearchParams();
      if (statusFilter !== 'ALL') rxParams.append('status', statusFilter);
      if (searchQuery.trim()) rxParams.append('search', searchQuery.trim());

      const [rxRes, patRes, medRes] = await Promise.all([
        fetch(`${API_BASE_URL}/prescriptions?${rxParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/patients`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/medicines`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [rxJson, patJson, medJson] = await Promise.all([
        rxRes.json(),
        patRes.json(),
        medRes.json(),
      ]);

      if (rxJson.success) setPrescriptions(rxJson.data?.prescriptions || []);
      if (patJson.success) setPatients(patJson.data?.patients || []);
      if (medJson.success) setMedicines(medJson.data?.medicines || []);
    } catch {
      showToast('Error', 'Unable to fetch data from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchQuery]);

  const handleAddItemRow = () => {
    setNewRx({
      ...newRx,
      items: [
        ...newRx.items,
        { medicine: '', dosageInstructions: '1 tablet twice daily after meals', quantityPrescribed: 10 },
      ],
    });
  };

  const handleRemoveItemRow = (index: number) => {
    if (newRx.items.length === 1) return;
    setNewRx({
      ...newRx,
      items: newRx.items.filter((_, i) => i !== index),
    });
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRx.patientId) {
      showToast('Validation Error', 'Please select a patient.', 'error');
      return;
    }
    if (!newRx.doctorName.trim()) {
      showToast('Validation Error', 'Doctor name is required.', 'error');
      return;
    }
    const invalidItem = newRx.items.find((i) => !i.medicine || i.quantityPrescribed <= 0);
    if (invalidItem) {
      showToast('Validation Error', 'Please select a valid medicine and positive quantity for all items.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRx),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        showToast('Prescription Saved', `Rx #${json.data.prescriptionNumber} registered.`);
        setShowAddModal(false);
        setNewRx({
          patientId: '',
          doctorName: '',
          department: 'General Medicine',
          prescriptionDate: new Date().toISOString().split('T')[0],
          notes: '',
          items: [{ medicine: '', dosageInstructions: '1 tablet twice daily after meals for 5 days', quantityPrescribed: 10 }],
        });
        fetchData();
      } else {
        showToast('Error', json.message || 'Failed to save prescription.', 'error');
      }
    } catch {
      showToast('Error', 'Unable to reach server.', 'error');
    }
  };

  const openDispenseModal = async (rx: Prescription) => {
    try {
      const rxId = rx.id || (rx as any)._id;
      const res = await fetch(`${API_BASE_URL}/prescriptions/${rxId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const fullRx: Prescription = json.data;
        setDispenseModalRx(fullRx);

        // Pre-fill default dispense quantities with remaining balance
        const initialMap: { [key: string]: number } = {};
        fullRx.items.forEach((item) => {
          const remaining = Math.max(0, item.quantityPrescribed - item.quantityDispensed);
          const itemId = item._id || (item.medicine as any)?._id || (item.medicine as string);
          initialMap[itemId] = remaining;
        });
        setDispenseItems(initialMap);
        setDispenseNotes('');
      }
    } catch {
      showToast('Error', 'Unable to load prescription batch details.', 'error');
    }
  };

  const handleExecuteDispense = async () => {
    if (!dispenseModalRx) return;
    setDispensingLoading(true);

    try {
      const rxId = dispenseModalRx.id || (dispenseModalRx as any)._id;
      const payloadItems = dispenseModalRx.items
        .map((item) => {
          const itemId = item._id || (item.medicine as any)?._id || (item.medicine as string);
          const qty = Number(dispenseItems[itemId]) || 0;
          return {
            medicineId: typeof item.medicine === 'object' ? (item.medicine as any)._id : item.medicine,
            itemId: item._id,
            quantity: qty,
          };
        })
        .filter((i) => i.quantity > 0);

      if (!payloadItems.length) {
        showToast('Validation Error', 'Please specify a quantity to dispense greater than 0.', 'warning');
        setDispensingLoading(false);
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
          notes: dispenseNotes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Dispensing Complete', 'Medications dispensed and inventory deducted via FEFO.');
        setDispenseReceipt({
          prescription: json.data.prescription,
          dispensedItems: json.data.dispensedItems,
          timestamp: new Date().toLocaleString(),
        });
        setDispenseModalRx(null);
        fetchData();
      } else {
        showToast('Dispense Failed', json.message || 'Unable to dispense items.', 'error');
      }
    } catch {
      showToast('Error', 'Unable to reach server.', 'error');
    } finally {
      setDispensingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-pharmagreen-700" />
            <span>Hospital Prescriptions</span>
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Log doctor prescriptions, verify batch availability, and execute FEFO stock dispensing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<PackageCheck className="w-3.5 h-3.5" />}
            onClick={() => navigate('/dispensing')}
          >
            Open Dispensing Desk
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModal(true)}>
            New Prescription
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 rounded-lg border border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-pharmagreen-700 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'ALL' ? 'All Prescriptions' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Rx #, Patient, Doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAF9] focus:bg-white text-xs pl-9 pr-3 py-1.5 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-600"
          />
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="bg-white rounded-lg border border-brand-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">Loading prescriptions ledger...</div>
        ) : prescriptions.length === 0 ? (
          <EmptyState
            title="No Prescriptions Found"
            description="There are currently no prescriptions matching your active filters. Log a new doctor prescription to begin."
            actionText="Create Prescription"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-brand-border text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Rx Number</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor & Dept</th>
                  <th className="py-3 px-4">Prescribed Items</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-gray-800">
                {prescriptions.map((rx) => {
                  const rxId = rx.id || (rx as any)._id;
                  const isPending = rx.status === 'PENDING';
                  const isPartial = rx.status === 'PARTIALLY_DISPENSED';
                  const isDispensed = rx.status === 'DISPENSED';

                  return (
                    <tr key={rxId} className="hover:bg-[#F9FBFA] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {rx.prescriptionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{rx.patientName}</div>
                        <div className="text-[11px] text-brand-muted">
                          {(rx.patient as any)?.patientId || 'MRN'} • {(rx.patient as any)?.hospitalId || 'OPD'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{rx.doctorName}</div>
                        <div className="text-[11px] text-brand-muted">{rx.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {rx.items.map((it, idx) => (
                            <div key={idx} className="text-[11px] flex items-center gap-1.5">
                              <span className="font-medium text-gray-900">{it.medicineName}:</span>
                              <span className="text-gray-600 font-mono">
                                {it.quantityDispensed}/{it.quantityPrescribed} units
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(rx.prescriptionDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isDispensed
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isPartial
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {rx.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(isPending || isPartial) ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<PackageCheck className="w-3.5 h-3.5" />}
                            onClick={() => openDispenseModal(rx)}
                            className="text-xs"
                          >
                            Dispense
                          </Button>
                        ) : (
                          <button
                            onClick={() => openDispenseModal(rx)}
                            className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                          >
                            View Record
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Prescription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-brand-border w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-pharmagreen-700" />
                <span>Log New Doctor Prescription</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Select Patient <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newRx.patientId}
                    onChange={(e) => setNewRx({ ...newRx, patientId: e.target.value })}
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  >
                    <option value="">-- Choose Registered Patient --</option>
                    {patients.map((p) => {
                      const pId = p.id || (p as any)._id;
                      return (
                        <option key={pId} value={pId}>
                          {p.name} ({p.patientId}) - {p.hospitalId || 'OPD'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Doctor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRx.doctorName}
                    onChange={(e) => setNewRx({ ...newRx, doctorName: e.target.value })}
                    placeholder="e.g. Dr. Suresh Mehta, MD"
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={newRx.department}
                    onChange={(e) => setNewRx({ ...newRx, department: e.target.value })}
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                    <option value="Emergency / Trauma">Emergency / Trauma</option>
                    <option value="ICU">ICU</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Prescription Date</label>
                  <input
                    type="date"
                    value={newRx.prescriptionDate}
                    onChange={(e) => setNewRx({ ...newRx, prescriptionDate: e.target.value })}
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
              </div>

              {/* Prescribed Medicines Items Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                    Prescribed Medicines ({newRx.items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-pharmagreen-700 hover:text-pharmagreen-800 font-bold text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine Line</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newRx.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-brand-border bg-[#F9FBFA] grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-5">
                        <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Medicine</label>
                        <select
                          required
                          value={item.medicine}
                          onChange={(e) => {
                            const updated = [...newRx.items];
                            updated[idx].medicine = e.target.value;
                            setNewRx({ ...newRx, items: updated });
                          }}
                          className="w-full bg-white p-1.5 rounded border border-brand-border text-xs"
                        >
                          <option value="">-- Choose Medicine --</option>
                          {medicines.map((m) => {
                            const mId = m.id || (m as any)._id;
                            return (
                              <option key={mId} value={mId}>
                                {m.name} ({m.totalStock} in stock)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="col-span-4">
                        <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Dosage / Instructions</label>
                        <input
                          type="text"
                          value={item.dosageInstructions}
                          onChange={(e) => {
                            const updated = [...newRx.items];
                            updated[idx].dosageInstructions = e.target.value;
                            setNewRx({ ...newRx, items: updated });
                          }}
                          placeholder="1 tab twice daily..."
                          className="w-full bg-white p-1.5 rounded border border-brand-border text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantityPrescribed}
                          onChange={(e) => {
                            const updated = [...newRx.items];
                            updated[idx].quantityPrescribed = Number(e.target.value);
                            setNewRx({ ...newRx, items: updated });
                          }}
                          className="w-full bg-white p-1.5 rounded border border-brand-border text-xs"
                        />
                      </div>

                      <div className="col-span-1 text-right pt-3">
                        {newRx.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Doctor Notes / Clinical Instructions</label>
                <textarea
                  rows={2}
                  value={newRx.notes}
                  onChange={(e) => setNewRx({ ...newRx, notes: e.target.value })}
                  placeholder="e.g. Post-operative 5-day course, monitor liver function"
                  className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Doctor Prescription
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispensing Modal */}
      {dispenseModalRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-brand-border w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-pharmagreen-700" />
                  <span>Dispense Prescription #{dispenseModalRx.prescriptionNumber}</span>
                </h2>
                <div className="text-xs text-brand-muted">
                  Patient: <strong className="text-gray-800">{dispenseModalRx.patientName}</strong> • Doctor:{' '}
                  <strong className="text-gray-800">{dispenseModalRx.doctorName}</strong>
                </div>
              </div>
              <button
                onClick={() => setDispenseModalRx(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient Allergy Alert */}
            {(dispenseModalRx.patient as any)?.allergies?.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Patient Known Allergies: {(dispenseModalRx.patient as any).allergies.join(', ')}</span>
              </div>
            )}

            {/* Prescribed Items & Batch Breakdown */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Prescribed Items & Real-Time Batch Availability
              </div>

              <div className="space-y-3">
                {dispenseModalRx.items.map((item) => {
                  const itemId = item._id || (item.medicine as any)?._id || (item.medicine as string);
                  const availableStock = item.availableStock ?? 0;
                  const remainingNeeded = Math.max(0, item.quantityPrescribed - item.quantityDispensed);
                  const isFullyDispensed = remainingNeeded === 0;

                  return (
                    <div
                      key={itemId}
                      className="p-3.5 rounded-lg border border-brand-border bg-[#F8FAF9] space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{item.medicineName}</div>
                          <div className="text-[11px] text-brand-muted mt-0.5">
                            Dosage: {item.dosageInstructions || 'As directed'}
                          </div>
                        </div>
                        <div className="text-right">
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
                              ? 'In Stock'
                              : availableStock > 0
                              ? `Low (${availableStock} avail)`
                              : 'Out of Stock'}
                          </span>
                        </div>
                      </div>

                      {/* Batches in FEFO order */}
                      {item.batches && item.batches.length > 0 && (
                        <div className="p-2 rounded bg-white border border-brand-border/70 space-y-1">
                          <div className="text-[10px] font-bold text-brand-muted uppercase">
                            FEFO Batches Queue:
                          </div>
                          {item.batches.map((b) => (
                            <div key={b.id} className="text-[11px] flex items-center justify-between text-gray-700 font-mono">
                              <span>Batch #{b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()})</span>
                              <span className="font-bold text-pharmagreen-700">{b.quantity} units</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dispense Controls */}
                      <div className="pt-2 border-t border-brand-border flex items-center justify-between">
                        <div className="text-[11px] text-gray-600 font-mono">
                          Prescribed: <strong>{item.quantityPrescribed}</strong> | Dispensed:{' '}
                          <strong className="text-pharmagreen-700">{item.quantityDispensed}</strong> | Remaining:{' '}
                          <strong className="text-gray-900">{remainingNeeded}</strong>
                        </div>

                        {!isFullyDispensed && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-gray-700">Dispense Qty:</label>
                            <input
                              type="number"
                              min="0"
                              max={Math.min(remainingNeeded, availableStock)}
                              value={dispenseItems[itemId] ?? remainingNeeded}
                              onChange={(e) =>
                                setDispenseItems({ ...dispenseItems, [itemId]: Number(e.target.value) })
                              }
                              className="w-16 bg-white p-1 rounded border border-brand-border text-center font-bold font-mono text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pharmacist Dispensing Remarks
                </label>
                <input
                  type="text"
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  placeholder="e.g. Verified with patient, instructed on dosage timing"
                  className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pharmagreen-700 shrink-0" />
                <span>
                  First Expiry, First Out (FEFO) algorithm will automatically deduct stock from the earliest expiring lots.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-brand-border">
              <Button variant="secondary" size="sm" onClick={() => setDispenseModalRx(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<PackageCheck className="w-3.5 h-3.5" />}
                loading={dispensingLoading}
                onClick={handleExecuteDispense}
              >
                Confirm & Deduct Stock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dispense Receipt Modal */}
      {dispenseReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-brand-border w-full max-w-md p-6 text-xs space-y-4">
            <div className="text-center pb-3 border-b border-brand-border">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-pharmagreen-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Dispensing Receipt</h2>
              <p className="text-[11px] text-brand-muted">MediSync Hospital Dispensing Ledger</p>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] bg-[#F8FAF9] p-3 rounded-lg border border-brand-border">
              <div className="flex justify-between">
                <span className="text-brand-muted">Rx Number:</span>
                <span className="font-bold text-gray-900">{dispenseReceipt.prescription.prescriptionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Patient:</span>
                <span className="font-bold text-gray-900">{dispenseReceipt.prescription.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Dispensed At:</span>
                <span>{dispenseReceipt.timestamp}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                Items Deducted From Lots:
              </div>
              {dispenseReceipt.dispensedItems.map((it: any, idx: number) => (
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
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
                className="w-1/2 text-xs"
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDispenseReceipt(null)}
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
