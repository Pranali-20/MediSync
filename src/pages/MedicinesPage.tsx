import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Pill,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Medicine } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const MedicinesPage: React.FC = () => {
  const { medicines, deleteMedicine, getStockStatus } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Medicine | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(medicines.map((m) => m.category));
    return ['All', ...Array.from(set)];
  }, [medicines]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.batches || []).some((b) => b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) || (b.barcode && b.barcode.includes(searchTerm)));

      const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;

      const status = getStockStatus(m);
      const matchesStock =
        stockFilter === 'All' ||
        (stockFilter === 'Healthy' && status === 'Healthy') ||
        (stockFilter === 'Low' && (status === 'Low' || status === 'Critical')) ||
        (stockFilter === 'Out of Stock' && status === 'Out of Stock');

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [medicines, searchTerm, categoryFilter, stockFilter, getStockStatus]);

  const handleDeleteConfirm = () => {
    if (deleteCandidate && (deleteCandidate._id || deleteCandidate.id)) {
      deleteMedicine((deleteCandidate._id || deleteCandidate.id) as string);
      setDeleteCandidate(null);
    }
  };

  // Helper to find earliest expiry among batches
  const getEarliestExpiry = (medicine: Medicine) => {
    if (!medicine.batches || medicine.batches.length === 0) return 'No active batch';
    const sorted = [...medicine.batches].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
    return sorted[0].expiryDate;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
          <p className="text-sm text-brand-muted mt-0.5">
            Manage your pharmacy medicines, pricing, and active batches.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/medicines/add')}
        >
          Add Medicine
        </Button>
      </div>

      {/* Search & Filter Controls */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search medicine, salt, batch, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none bg-[#F8FAF9]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-brand-muted">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-brand-border bg-white text-gray-700 focus:outline-none focus:border-pharmagreen-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-brand-border bg-white text-gray-700 focus:outline-none focus:border-pharmagreen-500"
            >
              <option value="All">All Stock Levels</option>
              <option value="Healthy">Healthy Stock</option>
              <option value="Low">Low / Critical Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            {(searchTerm || categoryFilter !== 'All' || stockFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('All');
                  setStockFilter('All');
                }}
                className="text-xs text-pharmagreen-700 hover:underline px-2 py-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Medicine Table */}
      <Card noPadding>
        {filteredMedicines.length === 0 ? (
          <EmptyState
            icon={<Pill className="w-8 h-8 text-pharmagreen-600" />}
            title="No medicines found"
            description="No medicines match your search criteria. Try clearing filters or add a new medicine."
            actionText="+ Add Medicine"
            onAction={() => navigate('/medicines/add')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F8FAF9] text-gray-600 font-semibold border-b border-brand-border">
                <tr>
                  <th className="px-5 py-3.5">Medicine & Salt</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">MRP</th>
                  <th className="px-5 py-3.5">Earliest Expiry</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredMedicines.map((med) => {
                  const stockStatus = getStockStatus(med);
                  const earliestExpiry = getEarliestExpiry(med);

                  return (
                    <tr
                      key={med.id}
                      className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/medicines/${med.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-pharmagreen-50 text-pharmagreen-700 flex items-center justify-center font-bold text-sm shrink-0 border border-pharmagreen-100">
                            {med.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              <span>{med.name}</span>
                              {med.requiresPrescription && <Badge variant="rx" size="sm" />}
                            </div>
                            <div className="text-xs text-brand-muted">{med.genericName}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              Mfg: {med.manufacturer} • {med.location}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="category">{med.category}</Badge>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{med.totalStock} units</div>
                        <div className="text-[11px] text-brand-muted">
                          {med.batches.length} active {med.batches.length === 1 ? 'batch' : 'batches'}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        ₹{(med.unitPrice || med.sellingPrice || 0).toFixed(2)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-xs font-medium text-gray-800">{earliestExpiry}</div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge status={stockStatus} />
                      </td>

                      <td
                        className="px-5 py-4 text-right relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-block text-left">
                          <button
                            onClick={() => {
                              const medId = med.id || med._id || '';
                              setActiveDropdownId(activeDropdownId === medId ? null : medId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdownId === (med.id || med._id) && (
                            <div className="absolute right-5 mt-1 w-36 bg-white rounded-lg shadow-dropdown border border-brand-border py-1 z-20 text-left">
                              <button
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  navigate(`/medicines/${med.id}`);
                                }}
                                className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>View Batches</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  navigate(`/medicines/edit/${med.id}`);
                                }}
                                className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                <span>Edit Medicine</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setDeleteCandidate(med);
                                }}
                                className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Medicine"
        message={`Are you sure you want to delete "${deleteCandidate?.name}"? All associated batch and inventory data will be removed.`}
        confirmText="Delete Medicine"
        variant="danger"
      />
    </div>
  );
};
