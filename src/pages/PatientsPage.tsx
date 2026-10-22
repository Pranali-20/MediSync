import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Calendar,
  AlertTriangle,
  FileText,
  Edit2,
  Trash2,
  Building,
  UserCheck,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Patient, Prescription } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const PatientsPage: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    name: '',
    phone: '',
    age: '',
    gender: 'Unspecified' as 'Male' | 'Female' | 'Other' | 'Unspecified',
    hospitalId: '',
    address: '',
    bloodGroup: '',
    allergies: '',
    emergencyContact: '',
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patients?search=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setPatients(json.data?.patients || []);
      }
    } catch {
      showToast('Error', 'Unable to load patients from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery]);

  const openAddModal = (patientToEdit?: Patient) => {
    if (patientToEdit) {
      setEditingPatient(patientToEdit);
      setFormData({
        patientId: patientToEdit.patientId || '',
        name: patientToEdit.name || '',
        phone: patientToEdit.phone || '',
        age: patientToEdit.age ? String(patientToEdit.age) : '',
        gender: patientToEdit.gender || 'Unspecified',
        hospitalId: patientToEdit.hospitalId || '',
        address: patientToEdit.address || '',
        bloodGroup: patientToEdit.bloodGroup || '',
        allergies: patientToEdit.allergies ? patientToEdit.allergies.join(', ') : '',
        emergencyContact: patientToEdit.emergencyContact || '',
      });
    } else {
      setEditingPatient(null);
      setFormData({
        patientId: '',
        name: '',
        phone: '',
        age: '',
        gender: 'Unspecified',
        hospitalId: '',
        address: '',
        bloodGroup: '',
        allergies: '',
        emergencyContact: '',
      });
    }
    setShowAddModal(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Validation Error', 'Patient name is required.', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        age: formData.age ? Number(formData.age) : null,
        allergies: formData.allergies
          ? formData.allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };

      const url = editingPatient
        ? `${API_BASE_URL}/patients/${editingPatient.id || (editingPatient as any)._id}`
        : `${API_BASE_URL}/patients`;
      const method = editingPatient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        showToast('Success', editingPatient ? 'Patient updated.' : 'Patient registered.');
        setShowAddModal(false);
        fetchPatients();
      } else {
        showToast('Error', json.message || 'Operation failed.', 'error');
      }
    } catch {
      showToast('Error', 'Unable to reach server.', 'error');
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this patient record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Deleted', 'Patient removed.');
        fetchPatients();
      } else {
        showToast('Cannot Delete', json.message || 'Error deleting patient.', 'error');
      }
    } catch {
      showToast('Error', 'Unable to reach server.', 'error');
    }
  };

  const openPatientHistory = async (p: Patient) => {
    setSelectedPatient(p);
    setLoadingPrescriptions(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${p.id || (p as any)._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setPatientPrescriptions(json.data?.prescriptions || []);
      }
    } catch {
      setPatientPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-pharmagreen-700" />
            <span>Patients Directory</span>
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Register and manage hospital inpatients, outpatients, and medical prescription histories.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => openAddModal()}>
          Register Patient
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-brand-border flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Patient ID, Name, Phone, or Hospital MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAF9] focus:bg-white text-xs pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-600"
          />
        </div>
        <div className="text-xs text-brand-muted font-medium">
          Total: <strong className="text-gray-900">{patients.length}</strong> Patients
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-lg border border-brand-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">Loading patients database...</div>
        ) : patients.length === 0 ? (
          <EmptyState
            title="No Patients Registered"
            description="Your patient directory is currently empty. Register a patient to start creating and dispensing prescriptions."
            actionText="Register First Patient"
            onAction={() => openAddModal()}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-brand-border text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Patient ID / MRN</th>
                  <th className="py-3 px-4">Name & Demographics</th>
                  <th className="py-3 px-4">Hospital UHID / Ward</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Blood Group & Allergies</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-gray-800">
                {patients.map((p) => {
                  const id = p.id || (p as any)._id;
                  return (
                    <tr key={id} className="hover:bg-[#F9FBFA] transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-mono text-[11px]">
                          {p.patientId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="text-[11px] text-brand-muted">
                          {p.gender !== 'Unspecified' ? p.gender : ''} {p.age ? `• ${p.age} yrs` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {p.hospitalId ? (
                          <span className="text-gray-700 font-medium">{p.hospitalId}</span>
                        ) : (
                          <span className="text-gray-400 italic">OPD / General</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">{p.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.bloodGroup && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              {p.bloodGroup}
                            </span>
                          )}
                          {p.allergies && p.allergies.length > 0 ? (
                            p.allergies.map((a, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold flex items-center gap-1"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {a}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-gray-400">None noted</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openPatientHistory(p)}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>History</span>
                        </button>
                        <button
                          onClick={() => openAddModal(p)}
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Edit Patient"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(id)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Patient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-brand-border w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-pharmagreen-700" />
                <span>{editingPatient ? 'Edit Patient Record' : 'Register New Patient'}</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Deshmukh"
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Patient ID / MRN</label>
                  <input
                    type="text"
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="45"
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unspecified">Unspecified</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Hospital ID / Ward / Bed</label>
                  <input
                    type="text"
                    value={formData.hospitalId}
                    onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                    placeholder="e.g. UHID-2026-8812 (Ward 3)"
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    placeholder="e.g. B+, O+, AB-"
                    className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa drugs (comma-separated)"
                  className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Area, City"
                  className="w-full bg-[#F8FAF9] p-2 rounded-lg border border-brand-border focus:bg-white focus:outline-none focus:border-pharmagreen-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingPatient ? 'Update Patient' : 'Save Patient Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient History & Prescriptions Drawer */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-brand-border p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{selectedPatient.name}</h2>
                  <div className="text-xs text-brand-muted">
                    MRN: <span className="font-mono font-bold text-gray-800">{selectedPatient.patientId}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Patient Quick Summary */}
              <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-brand-border/80 mb-5 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-brand-muted">Gender / Age:</span>{' '}
                    <strong className="text-gray-800">
                      {selectedPatient.gender} {selectedPatient.age ? `(${selectedPatient.age} yrs)` : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-brand-muted">Phone:</span>{' '}
                    <strong className="text-gray-800 font-mono">{selectedPatient.phone || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-brand-muted">Hospital / Ward:</span>{' '}
                    <strong className="text-gray-800">{selectedPatient.hospitalId || 'Outpatient'}</strong>
                  </div>
                  <div>
                    <span className="text-brand-muted">Blood Group:</span>{' '}
                    <strong className="text-rose-700">{selectedPatient.bloodGroup || 'Not recorded'}</strong>
                  </div>
                </div>

                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <div className="pt-2 border-t border-brand-border/60 flex items-center gap-1.5 text-amber-800 font-semibold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Allergies: {selectedPatient.allergies.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Prescriptions History Header */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pharmagreen-700" />
                <span>Prescription History ({patientPrescriptions.length})</span>
              </h3>

              {loadingPrescriptions ? (
                <div className="p-6 text-center text-xs text-gray-500">Loading prescription ledger...</div>
              ) : patientPrescriptions.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-brand-border rounded-lg text-xs text-brand-muted">
                  No prescriptions recorded for this patient yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {patientPrescriptions.map((rx) => {
                    const rxId = rx.id || (rx as any)._id;
                    const isPending = rx.status === 'PENDING';
                    const isPartial = rx.status === 'PARTIALLY_DISPENSED';
                    const isDispensed = rx.status === 'DISPENSED';

                    return (
                      <div
                        key={rxId}
                        className="p-3.5 rounded-lg border border-brand-border bg-white shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-gray-900 font-mono">{rx.prescriptionNumber}</div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDispensed
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isPartial
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {rx.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-brand-muted">
                          Dr. {rx.doctorName} • {rx.department} • {new Date(rx.prescriptionDate).toLocaleDateString()}
                        </div>

                        <div className="pt-2 border-t border-gray-100 space-y-1">
                          {rx.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-gray-800">{item.medicineName}</span>
                              <span className="font-mono text-gray-600">
                                Prescribed: <strong>{item.quantityPrescribed}</strong> | Dispensed:{' '}
                                <strong className="text-pharmagreen-700">{item.quantityDispensed}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-brand-border">
              <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => setSelectedPatient(null)}>
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
