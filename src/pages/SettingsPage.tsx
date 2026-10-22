import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  Building2,
  Store,
  Layers,
  Building,
  Shield,
  Phone,
  Mail,
  MapPin,
  Users,
  UserPlus,
  History,
  ShieldCheck,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { PharmacyType, UserMember, AuditLogItem } from '../types';
import { userApi, auditApi } from '../services/extraApis';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const SettingsPage: React.FC = () => {
  const { user, pharmacy, pharmacyType, updatePharmacyType, token, refreshUser } = useAuth();
  const { settings, updateSettings } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'audit'>('general');

  // General Settings State
  const [currentType, setCurrentType] = useState<PharmacyType>(pharmacyType || 'retail');
  const [pharmacyName, setPharmacyName] = useState(user?.pharmacyName || settings.pharmacyName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [licenseNumber, setLicenseNumber] = useState(user?.licenseNumber || settings.licenseNumber);
  const [gstin, setGstin] = useState(user?.gstNumber || settings.gstin);
  const [address, setAddress] = useState(user?.address || settings.address);
  const [phone, setPhone] = useState(user?.phone || settings.phone);
  const [email, setEmail] = useState(user?.email || settings.email);
  const [isSaved, setIsSaved] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Team Management State
  const [teamUsers, setTeamUsers] = useState<UserMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password123');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'pharmacist' | 'staff'>('pharmacist');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState('ALL');

  // Feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (pharmacyType) {
      setCurrentType(pharmacyType);
    }
  }, [pharmacyType]);

  // Load team users
  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await userApi.getUsers();
      setTeamUsers(res || []);
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Load audit logs
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await auditApi.getAuditLogs({ entity: auditFilter !== 'ALL' ? auditFilter : undefined });
      setAuditLogs(res?.data?.logs || res?.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team') fetchTeam();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, auditFilter]);

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    setIsSaved(false);

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/pharmacy`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: pharmacyName,
            tagline,
            licenseNumber,
            gstNumber: gstin,
            address,
            phone,
            email,
          }),
        });

        if (currentType !== pharmacyType) {
          await updatePharmacyType(currentType);
        }

        await refreshUser();
      }

      updateSettings({
        pharmacyName,
        pharmacyType: currentType,
        tagline,
        licenseNumber,
        gstin,
        address,
        phone,
        email,
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.toString());
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    setFeedback(null);

    try {
      await userApi.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        phone: newUserPhone,
      });

      setFeedback({ type: 'success', text: `Team member ${newUserName} added successfully!` });
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      fetchTeam();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.toString() || 'Failed to add user.' });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await userApi.updateUserRole(userId, { role: newRole });
      fetchTeam();
    } catch (err: any) {
      alert('Failed to update role.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-text">Pharmacy Settings & Configuration</h1>
        <p className="text-xs text-brand-muted mt-0.5">
          Manage your operational mode, hospital/retail workflows, team access permissions, and accountability logs.
        </p>
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-brand-border gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'general' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          General & Operating Mode
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'team' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          Team & Access Roles ({teamUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'audit' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          System Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: GENERAL & PHARMACY TYPE */}
      {activeTab === 'general' && (
        <form onSubmit={handleGeneralSubmit} className="space-y-6">
          {/* Pharmacy Type Selection */}
          <div className="bg-white rounded-xl border border-brand-border p-5 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Pharmacy Operating Model
              </h2>
              <p className="text-xs text-brand-muted mt-0.5">
                Selecting a model dynamically tailors your dashboard, sidebar navigation, patient records, and dispensing workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Option 1: Hospital */}
              <div
                onClick={() => setCurrentType('hospital')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  currentType === 'hospital'
                    ? 'border-pharmagreen-600 bg-emerald-50/50 ring-1 ring-pharmagreen-500'
                    : 'border-brand-border bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${currentType === 'hospital' ? 'bg-pharmagreen-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Building className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-gray-900">Hospital-Attached</span>
                </div>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Inpatient/outpatient queues, doctor prescriptions, clinical verification & batch-level FEFO dispensing.
                </p>
              </div>

              {/* Option 2: Retail */}
              <div
                onClick={() => setCurrentType('retail')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  currentType === 'retail'
                    ? 'border-pharmagreen-600 bg-emerald-50/50 ring-1 ring-pharmagreen-500'
                    : 'border-brand-border bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${currentType === 'retail' ? 'bg-pharmagreen-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-gray-900">Open-Counter / Retail</span>
                </div>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Fast counter POS billing, customer receipts, OTC catalog, inventory restocking & sales revenue analytics.
                </p>
              </div>

              {/* Option 3: Hybrid */}
              <div
                onClick={() => setCurrentType('hybrid')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  currentType === 'hybrid'
                    ? 'border-pharmagreen-600 bg-emerald-50/50 ring-1 ring-pharmagreen-500'
                    : 'border-brand-border bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${currentType === 'hybrid' ? 'bg-pharmagreen-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-gray-900">Hybrid (Combined)</span>
                </div>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Both Hospital Dispensing and Retail POS Billing concurrently operating on a single unified inventory.
                </p>
              </div>
            </div>
          </div>

          {/* Pharmacy Profile Details */}
          <div className="bg-white rounded-xl border border-brand-border p-5 space-y-4 shadow-2xs">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Store & License Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Pharmacy Name</label>
                <input
                  type="text"
                  required
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Pharmacy Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Drug License #</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Official Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Store / Hospital Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isSaved ? (
              <span className="text-xs text-pharmagreen-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Configuration saved successfully!
              </span>
            ) : (
              <span />
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={savingGeneral}
              icon={<Save className="w-4 h-4" />}
              className="text-xs font-bold"
            >
              Save Configuration
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: TEAM & ACCESS ROLES */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-brand-border shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-pharmagreen-600" />
                Pharmacy Staff & Role Permissions
              </h2>
              <p className="text-xs text-brand-muted mt-0.5">
                Assign roles (Admin, Pharmacist, Staff) to control operational capabilities across billing, purchases, and stock adjustments.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setShowAddUserModal(true)}
              className="text-xs"
            >
              + Add User
            </Button>
          </div>

          {loadingTeam ? (
            <div className="text-center py-16 text-xs text-brand-muted">Loading team members...</div>
          ) : teamUsers.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
              No additional team members added.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3">Member Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Role / Access Level</th>
                    <th className="px-4 py-3">Shift Hours</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3 text-right">Role Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {teamUsers.map((member) => (
                    <tr key={member._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-bold text-gray-900">{member.name}</td>
                      <td className="px-4 py-3 text-brand-muted font-mono">{member.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            member.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : member.role === 'pharmacist'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {member.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{member.shiftHours || '08:00 AM - 04:00 PM'}</td>
                      <td className="px-4 py-3 text-brand-muted">{new Date(member.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member._id, e.target.value)}
                          className="text-[11px] bg-[#F8FAF9] border border-brand-border rounded px-2 py-1 font-semibold focus:outline-none"
                        >
                          <option value="admin">Admin / Owner</option>
                          <option value="pharmacist">Pharmacist</option>
                          <option value="staff">Staff (Limited)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-pharmagreen-600" />
                Immutable System Audit Trail
              </h2>
              <p className="text-xs text-brand-muted mt-0.5">
                Complete traceability for inventory corrections, purchases, sales returns, and master changes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-brand-muted">Filter Entity:</span>
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Entities</option>
                <option value="Batch">Batch Adjustments</option>
                <option value="PurchaseOrder">Purchase Orders</option>
                <option value="Sale">Sales & Returns</option>
                <option value="Medicine">Medicine Master</option>
                <option value="User">User Management</option>
              </select>
            </div>
          </div>

          {loadingAudit ? (
            <div className="text-center py-16 text-xs text-brand-muted">Loading audit log records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
              No audit logs recorded matching this filter.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action Event</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-brand-muted">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{log.entity}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{log.userName}</span>
                        <span className="block text-[10px] text-gray-400">({log.userRole})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 leading-relaxed">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <Modal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          title="Add New Pharmacy User"
          maxWidth="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Dr. Priya Nair"
                className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="priya@pharmacy.com"
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">User Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                >
                  <option value="pharmacist">Pharmacist (Full Ops)</option>
                  <option value="admin">Owner / Admin</option>
                  <option value="staff">Staff (POS & View Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddUserModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submittingUser}>
                Create User Account
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default SettingsPage;
