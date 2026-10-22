import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit2,
  Trash2,
  Clock,
  Package,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';

export const SuppliersPage: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState(2);
  const [rating, setRating] = useState(4.8);
  const [medicinesSuppliedInput, setMedicinesSuppliedInput] = useState('');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.company || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const handleOpenAdd = () => {
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstNumber('');
    setLeadTimeDays(2);
    setRating(4.8);
    setMedicinesSuppliedInput('');
    setEditingSupplier(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name || '');
    setCompany(sup.company || sup.name || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setGstNumber(sup.gstNumber || '');
    setLeadTimeDays(sup.leadTimeDays || 2);
    setRating(sup.rating || 4.8);
    setMedicinesSuppliedInput((sup.medicinesSupplied || []).join(', '));
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const medList = medicinesSuppliedInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingSupplier) {
      const supId = editingSupplier.id || editingSupplier._id || '';
      updateSupplier(supId, {
        name,
        company,
        phone,
        email,
        address,
        gstNumber,
        leadTimeDays: Number(leadTimeDays),
        rating: Number(rating),
        medicinesSupplied: medList,
      });
    } else {
      addSupplier({
        name,
        company,
        phone,
        email,
        address,
        gstNumber,
        leadTimeDays: Number(leadTimeDays),
        rating: Number(rating),
        medicinesSupplied: medList.length > 0 ? medList : ['General Pharmaceuticals'],
      });
    }

    setShowAddModal(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      const supId = deleteCandidate.id || deleteCandidate._id || '';
      deleteSupplier(supId);
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers Directory</h1>
          <p className="text-sm text-brand-muted mt-0.5">
            Manage pharmaceutical vendors, supply lead times, and purchase accounts.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          Add Supplier
        </Button>
      </div>

      {/* Search Input */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search supplier by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
          />
        </div>
      </Card>

      {/* Suppliers Table */}
      <Card noPadding>
        {filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-8 h-8 text-pharmagreen-600" />}
            title="No suppliers found"
            description="Add your authorized pharmaceutical vendors and logistics contacts."
            actionText="+ Add Supplier"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F8FAF9] text-gray-600 font-semibold border-b border-brand-border">
                <tr>
                  <th className="px-5 py-3.5">Supplier Name & Company</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Medicines Supplied</th>
                  <th className="px-5 py-3.5">Lead Time</th>
                  <th className="px-5 py-3.5">Rating</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">{sup.name}</div>
                      <div className="text-xs text-brand-muted">{sup.company}</div>
                      {sup.gstNumber && (
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          GST: {sup.gstNumber}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-800">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{sup.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-brand-muted mt-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{sup.email}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(sup.medicinesSupplied || []).map((med, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-pharmagreen-50 text-pharmagreen-800 border border-pharmagreen-200"
                          >
                            {med}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-800">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{sup.leadTimeDays} {sup.leadTimeDays === 1 ? 'day' : 'days'}</span>
                      </div>
                      <div className="text-[11px] text-brand-muted mt-0.5">
                        {sup.totalOrders} past orders
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-amber-600 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{sup.rating.toFixed(1)}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          className="p-1.5 text-gray-500 hover:text-pharmagreen-700 hover:bg-gray-100 rounded-md transition-colors"
                          title="Edit supplier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(sup)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete supplier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        subtitle="Register verified pharmaceutical distributor and logistics parameters"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Supplier / Point of Contact <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sun Pharma Distributors"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Sun Pharmaceutical Ltd."
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200..."
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@supplier.com"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="27AABCS1429B1ZX"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Rating (1-5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  required
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Medicines Supplied (Comma separated)
              </label>
              <input
                type="text"
                value={medicinesSuppliedInput}
                onChange={(e) => setMedicinesSuppliedInput(e.target.value)}
                placeholder="e.g. Paracetamol 500mg, Amoxicillin 500mg, Ibuprofen 400mg"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Warehouse / Supply Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Plot 14, Whitefield Industrial Area, Bengaluru"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-brand-border focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier"
        message={`Are you sure you want to remove "${deleteCandidate?.name}" from your supplier directory?`}
        confirmText="Delete Supplier"
        variant="danger"
      />
    </div>
  );
};
