import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Banknote,
  RotateCcw,
  Clock,
  Building2,
  X,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Bill, Medicine, Batch } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import { billingApi } from '../services/billingApi';
import { medicineApi } from '../services/medicineApi';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Medicines Catalog for POS
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [salesHistory, setSalesHistory] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Customer & Bill Details
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Insurance'>('UPI');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Cart State
  const [cart, setCart] = useState<
    Array<{
      medicine: Medicine;
      selectedBatch: Batch;
      quantity: number;
      unitPrice: number;
    }>
  >([]);

  // Generated Invoice for modal
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [submittingBill, setSubmittingBill] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Return Processing State
  const [returnInvoice, setReturnInvoice] = useState<Bill | null>(null);
  const [returnItems, setReturnItems] = useState<
    Array<{
      saleItemId: string;
      medicineName: string;
      batchNumber: string;
      unitPrice: number;
      maxReturnable: number;
      returnQuantity: number;
      condition: 'SELLABLE' | 'DAMAGED' | 'EXPIRED' | 'NON_RESELLABLE';
    }>
  >([]);
  const [returnReason, setReturnReason] = useState('Customer returned unopened product');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Fetch medicines and sales
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [medRes, salesRes] = await Promise.all([
        medicineApi.getMedicines({ limit: 300 }),
        billingApi.getSales({ limit: 100 }),
      ]);
      setMedicines(medRes?.data?.medicines || medRes?.medicines || []);
      setSalesHistory(salesRes?.data?.sales || salesRes?.sales || []);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const categories = useMemo(() => {
    const list = Array.from(new Set(medicines.map((m) => m.category)));
    return ['All', ...list];
  }, [medicines]);

  // Filtered available medicines
  const availableMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.genericName.toLowerCase().includes(term) ||
        (m.barcode && m.barcode.includes(term)) ||
        (m.batches && m.batches.some((b) => b.batchNumber.toLowerCase().includes(term)));

      const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [medicines, searchTerm, selectedCategory]);

  // Add to cart with automated FEFO batch resolution
  const handleAddToCart = (medicine: Medicine) => {
    const activeBatches = (medicine.batches || [])
      .filter((b) => b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    if (activeBatches.length === 0) {
      alert(`Cannot add ${medicine.name}: Currently out of stock.`);
      return;
    }

    const fefoBatch = activeBatches[0];
    const existingIndex = cart.findIndex(
      (item) => (item.medicine._id || item.medicine.id) === (medicine._id || medicine.id) && item.selectedBatch.batchNumber === fefoBatch.batchNumber
    );

    if (existingIndex !== -1) {
      const existing = cart[existingIndex];
      if (existing.quantity + 1 > fefoBatch.quantity) {
        alert(`Maximum stock reached for Batch ${fefoBatch.batchNumber} (${fefoBatch.quantity} available).`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          medicine,
          selectedBatch: fefoBatch,
          quantity: 1,
          unitPrice: fefoBatch.sellingPrice || medicine.sellingPrice || 20,
        },
      ]);
    }
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }
    const item = cart[index];
    if (newQty > item.selectedBatch.quantity) {
      alert(`Cannot exceed batch stock of ${item.selectedBatch.quantity} units.`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  // Switch Batch for a Cart Item (Manual Override)
  const handleSwitchBatch = (cartIndex: number, newBatchId: string) => {
    const item = cart[cartIndex];
    const newBatch = (item.medicine.batches || []).find((b) => (b._id || b.id) === newBatchId);
    if (!newBatch) return;

    const updated = [...cart];
    updated[cartIndex].selectedBatch = newBatch;
    updated[cartIndex].unitPrice = newBatch.sellingPrice || updated[cartIndex].unitPrice;
    if (updated[cartIndex].quantity > newBatch.quantity) {
      updated[cartIndex].quantity = Math.max(1, newBatch.quantity);
    }
    setCart(updated);
  };

  // Cart Financials
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * 12) / 100; // 12% GST
  const grandTotal = taxableAmount + taxAmount;

  // Checkout & Submit Sale
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmittingBill(true);
    setFeedback(null);

    try {
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim(),
        doctorName: doctorName.trim(),
        discountPercent,
        paymentMethod,
        items: cart.map((item) => ({
          medicineId: (item.medicine._id || item.medicine.id) as string,
          batchId: (item.selectedBatch._id || item.selectedBatch.id) as string,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxPercent: 12,
        })),
      };

      const bill = await billingApi.createSale(payload);
      setCompletedBill(bill);
      showToast('Sale Completed', `Invoice ${bill.invoiceNumber || 'generated'} completed successfully.`, 'success');
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setDoctorName('');
      setDiscountPercent(0);
      fetchAll();
    } catch (err: any) {
      const msg = err?.toString() || 'Failed to process checkout bill.';
      setFeedback({ type: 'error', text: msg });
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingBill(false);
    }
  };

  // Open Return Processing Modal
  const handleOpenReturnModal = (sale: Bill) => {
    setReturnInvoice(sale);
    setReturnReason('Customer returned unopened product');

    const defaultReturnItems = sale.items.map((it) => {
      const maxReturnable = it.quantity - (it.quantityReturned || 0);
      return {
        saleItemId: it._id || '',
        medicineName: it.medicineName,
        batchNumber: it.batchNumber,
        unitPrice: it.unitPrice,
        maxReturnable,
        returnQuantity: 0,
        condition: 'SELLABLE' as const,
      };
    });

    setReturnItems(defaultReturnItems);
  };

  // Submit Sale Return
  const handleSubmitReturn = async () => {
    if (!returnInvoice) return;
    const itemsToReturn = returnItems.filter((i) => i.returnQuantity > 0);
    if (itemsToReturn.length === 0) {
      showToast('Items Required', 'Please specify a return quantity > 0 for at least one item.', 'warning');
      return;
    }

    setSubmittingReturn(true);
    try {
      await billingApi.processSaleReturn(returnInvoice._id || returnInvoice.id || '', {
        reason: returnReason,
        returnItems: itemsToReturn.map((it) => ({
          saleItemId: it.saleItemId,
          quantity: Number(it.returnQuantity),
          condition: it.condition,
        })),
      });

      setFeedback({ type: 'success', text: `Return processed on invoice ${returnInvoice.invoiceNumber}. Inventory restored accordingly.` });
      showToast('Return Processed', `Return processed on invoice ${returnInvoice.invoiceNumber}. Inventory updated.`, 'success');
      setReturnInvoice(null);
      fetchAll();
    } catch (err: any) {
      const msg = err?.toString() || 'Failed to process return.';
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Receipt className="w-6 h-6 text-pharmagreen-600" />
            Point of Sale & Counter Billing
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Real-time counter POS billing with automatic FEFO batch selection, instant receipt printing, and customer returns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-brand-border rounded-lg overflow-hidden bg-white text-xs">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1.5 font-semibold transition-colors ${activeTab === 'pos' ? 'bg-pharmagreen-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              POS Billing
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 font-semibold transition-colors ${activeTab === 'history' ? 'bg-pharmagreen-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Invoices & Returns ({salesHistory.length})
            </button>
          </div>
        </div>
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

      {/* POS BILLING TAB */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Medicine Catalog Browser */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Category Filter */}
            <div className="bg-white rounded-xl border border-brand-border p-3.5 flex flex-col sm:flex-row gap-3 shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Scan barcode or search medicine name / generic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAF9] border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Medicine Cards List */}
            {loading ? (
              <div className="text-center py-16 text-xs text-brand-muted">Loading medicines catalog...</div>
            ) : availableMedicines.length === 0 ? (
              <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
                No matching medicines found in catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableMedicines.map((med) => {
                  const activeBatches = (med.batches || []).filter((b) => b.quantity > 0);
                  const isOutOfStock = med.totalStock === 0 || activeBatches.length === 0;
                  const earliestBatch = activeBatches.sort(
                    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                  )[0];

                  return (
                    <div
                      key={med._id || med.id}
                      onClick={() => !isOutOfStock && handleAddToCart(med)}
                      className={`p-3.5 rounded-xl border transition-all select-none ${
                        isOutOfStock
                          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-brand-border hover:border-pharmagreen-500 hover:shadow-xs cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="truncate">
                          <h3 className="font-bold text-gray-900 text-xs truncate">{med.name}</h3>
                          <p className="text-[11px] text-brand-muted font-mono truncate">{med.genericName}</p>
                        </div>
                        <span className="font-bold text-xs text-pharmagreen-800 font-mono">
                          ₹{med.sellingPrice?.toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className={`font-semibold ${isOutOfStock ? 'text-red-600' : 'text-gray-700'}`}>
                          {isOutOfStock ? '0 in stock' : `${med.totalStock} ${med.unit || 'units'}`}
                        </span>

                        {earliestBatch && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            FEFO: Lot #{earliestBatch.batchNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Active Bill & Cart */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center justify-between border-b border-brand-border pb-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-pharmagreen-600" />
                  Active Invoice Cart ({cart.length} items)
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Customer Info Form */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-brand-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Customer Phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-brand-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                  />
                </div>
              </div>

              {/* Cart Items List with Batch Override */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-xs text-brand-muted border border-dashed border-brand-border rounded-xl">
                    Cart is empty. Click medicines from the catalog to add items.
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-[#F8FAF9] rounded-lg border border-brand-border text-xs space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-900 truncate">{item.medicine.name}</span>
                        <span className="font-bold font-mono text-gray-900">
                          ₹{(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] gap-2">
                        {/* Batch Selector Dropdown */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-brand-muted">Batch:</span>
                          <select
                            value={item.selectedBatch._id || item.selectedBatch.id}
                            onChange={(e) => handleSwitchBatch(idx, e.target.value)}
                            className="bg-white border border-brand-border rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-pharmagreen-800 focus:outline-none"
                          >
                            {(item.medicine.batches || [])
                              .filter((b) => b.quantity > 0)
                              .map((b) => (
                                <option key={b._id || b.id} value={b._id || b.id}>
                                  #{b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()}, {b.quantity} left)
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                            className="w-5 h-5 rounded bg-white border border-brand-border flex items-center justify-center hover:bg-gray-100 font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold font-mono">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                            className="w-5 h-5 rounded bg-white border border-brand-border flex items-center justify-center hover:bg-gray-100 font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleUpdateQty(idx, 0)}
                            className="text-red-400 hover:text-red-600 p-0.5 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Method & Discount */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-brand-border text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-brand-muted">Payment Method:</span>
                    <div className="flex gap-1.5">
                      {(['UPI', 'Cash', 'Card'] as const).map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                            paymentMethod === method
                              ? 'bg-pharmagreen-600 text-white border-pharmagreen-600'
                              : 'bg-white text-gray-700 border-brand-border hover:bg-gray-50'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Breakdown */}
                  <div className="space-y-1 text-xs pt-1">
                    <div className="flex justify-between text-brand-muted">
                      <span>Subtotal:</span>
                      <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-brand-muted">
                      <span>GST (12% Included):</span>
                      <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-gray-900 pt-1.5 border-t border-brand-border">
                      <span>Total Due:</span>
                      <span className="text-pharmagreen-800 font-mono">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    loading={submittingBill}
                    onClick={handleCheckout}
                    className="w-full text-xs font-bold"
                  >
                    Deduct Stock & Complete Bill (₹{grandTotal.toFixed(2)})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SALES HISTORY & RETURNS TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-pharmagreen-600" />
              Completed Sales Invoices & Customer Returns
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              Review transaction history, print invoices, or process customer returns with condition inspection.
            </p>
          </div>

          {salesHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
              No sales invoices generated yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items Sold</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {salesHistory.map((sale) => (
                      <tr key={sale._id || sale.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{sale.invoiceNumber}</td>
                        <td className="px-4 py-3 text-brand-muted">
                          {new Date(sale.createdAt || sale.date || Date.now()).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {sale.customerName}
                          {sale.customerPhone && <span className="block text-[10px] text-gray-400">{sale.customerPhone}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] space-y-0.5">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="text-gray-700">
                                {it.medicineName} (Lot #{it.batchNumber}) × {it.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold font-mono text-gray-900">₹{sale.totalAmount?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {sale.status === 'RETURNED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Returned</span>
                          ) : sale.status === 'PARTIALLY_RETURNED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Partially Returned</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Completed</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<RotateCcw className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenReturnModal(sale)}
                              className="text-[11px] py-1 px-2.5"
                            >
                              Process Return
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      {completedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-brand-border w-full max-w-md p-6 text-xs space-y-4">
            <div className="text-center pb-3 border-b border-brand-border">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-pharmagreen-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Payment Invoice Generated</h2>
              <p className="text-[11px] text-brand-muted">{completedBill.invoiceNumber}</p>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] bg-[#F8FAF9] p-3 rounded-lg border border-brand-border">
              <div className="flex justify-between">
                <span className="text-brand-muted">Customer:</span>
                <span className="font-bold text-gray-900">{completedBill.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Payment:</span>
                <span>{completedBill.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">Total Paid:</span>
                <span className="font-bold text-pharmagreen-800">₹{completedBill.totalAmount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {completedBill.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-100 font-mono text-[11px]">
                  <span>{it.medicineName} ({it.quantity} × ₹{it.unitPrice})</span>
                  <span className="font-bold text-gray-900">₹{(it.quantity * it.unitPrice).toFixed(2)}</span>
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
                Print Receipt
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCompletedBill(null)}
                className="w-1/2 text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS RETURN MODAL */}
      {returnInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-brand-border w-full max-w-2xl p-6 text-xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  Process Customer Return (Invoice {returnInvoice.invoiceNumber})
                </h2>
                <p className="text-[11px] text-brand-muted mt-0.5">
                  Inspect returned items. Only items marked as <strong>SELLABLE</strong> will be restored to usable inventory.
                </p>
              </div>
              <button onClick={() => setReturnInvoice(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">Return Items & Condition Assessment:</label>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {returnItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#F8FAF9] rounded-lg border border-brand-border grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-4">
                      <span className="font-bold text-gray-900 block truncate">{item.medicineName}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Lot #{item.batchNumber} (Max: {item.maxReturnable})</span>
                    </div>

                    <div className="sm:col-span-3">
                      <span className="text-[10px] text-gray-500 block mb-0.5">Return Qty:</span>
                      <input
                        type="number"
                        min="0"
                        max={item.maxReturnable}
                        value={item.returnQuantity}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].returnQuantity = Number(e.target.value);
                          setReturnItems(updated);
                        }}
                        className="w-full bg-white border border-brand-border rounded px-2 py-1 font-bold text-center"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <span className="text-[10px] text-gray-500 block mb-0.5">Condition:</span>
                      <select
                        value={item.condition}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].condition = e.target.value as any;
                          setReturnItems(updated);
                        }}
                        className="w-full bg-white border border-brand-border rounded px-2 py-1 text-xs"
                      >
                        <option value="SELLABLE">Sellable (Restores Stock)</option>
                        <option value="DAMAGED">Damaged (Quarantine/Loss)</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="NON_RESELLABLE">Non-Resellable</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Return Reason / Notes</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full text-xs bg-[#F8FAF9] border border-brand-border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              />
            </div>

            <div className="pt-3 border-t border-brand-border flex items-center justify-between">
              <div className="text-xs font-bold text-gray-800">
                Total Refund Due: <span className="font-mono text-amber-700">₹{returnItems.reduce((sum, it) => sum + it.returnQuantity * it.unitPrice, 0).toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setReturnInvoice(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={submittingReturn}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleSubmitReturn}
                  className="text-xs"
                >
                  Confirm Return & Adjust Stock
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillingPage;
