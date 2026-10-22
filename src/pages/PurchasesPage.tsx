import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  PackageCheck,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  Truck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Receipt,
  X,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import { purchaseApi } from '../services/purchaseApi';
import { medicineApi } from '../services/medicineApi';
import { supplierApi } from '../services/extraApis';
import { PurchaseOrder, Medicine, Supplier } from '../types';

export const PurchasesPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'create' | 'prices'>('orders');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Receiving Modal State
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveInvoiceRef, setReceiveInvoiceRef] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receivedLots, setReceivedLots] = useState<any[]>([]);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New PO State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poExpectedDate, setPoExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{ medicineId: string; medicineName: string; quantity: number; unitPrice: number; expectedBatchNumber: string }>>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, supRes, medRes, pricesRes] = await Promise.all([
        purchaseApi.getPurchaseOrders({ status: statusFilter !== 'ALL' ? statusFilter : undefined, search: searchTerm }),
        supplierApi.getSuppliers(),
        medicineApi.getMedicines({ limit: 200 }),
        purchaseApi.getPriceHistory(),
      ]);

      setOrders(ordersRes?.data?.orders || ordersRes?.orders || []);
      setSuppliers(supRes || []);
      setMedicines(medRes?.data?.medicines || medRes?.medicines || []);
      setPriceHistory(pricesRes || []);
    } catch (err: any) {
      console.error('Failed to load purchase data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Open Receiving Modal
  const handleOpenReceiveModal = (order: PurchaseOrder) => {
    setReceivingOrder(order);
    setReceiveInvoiceRef('');
    setReceiveNotes('');
    
    // Pre-populate receiving inputs from PO items
    const defaultLots = order.items.map((item: any) => {
      const remainingToReceive = Math.max(0, item.quantityOrdered - (item.quantityReceived || 0));
      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 2);

      return {
        medicineId: typeof item.medicine === 'object' ? item.medicine._id : item.medicine,
        medicineName: item.medicineName,
        batchNumber: item.expectedBatchNumber || `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        quantityReceived: remainingToReceive,
        purchasePrice: item.unitPrice || 0,
        sellingPrice: Number(((item.unitPrice || 10) * 1.3).toFixed(2)),
        manufacturingDate: today.toISOString().split('T')[0],
        expiryDate: nextYear.toISOString().split('T')[0],
      };
    });

    setReceivedLots(defaultLots);
  };

  // Submit Receiving Shipment
  const handleConfirmReceive = async () => {
    if (!receivingOrder) return;
    setReceiveSubmitting(true);
    setFeedbackMsg(null);

    try {
      await purchaseApi.receiveShipment(receivingOrder._id, {
        invoiceReference: receiveInvoiceRef,
        notes: receiveNotes,
        receivedItems: receivedLots,
      });

      setFeedbackMsg({ type: 'success', text: `Shipment for PO ${receivingOrder.orderNumber} successfully received and inventory updated!` });
      showToast('Shipment Received', `Inwarded lots for PO ${receivingOrder.orderNumber} into inventory.`, 'success');
      setReceivingOrder(null);
      fetchData();
    } catch (err: any) {
      const msg = err?.toString() || 'Failed to process shipment receipt.';
      setFeedbackMsg({ type: 'error', text: msg });
      showToast('Error', msg, 'error');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // Add Item to Create PO Form
  const handleAddPoItem = (medId: string) => {
    if (!medId) return;
    const med = medicines.find((m) => m._id === medId || m.id === medId);
    if (!med) return;

    if (poItems.some((i) => i.medicineId === med._id)) return;

    setPoItems([
      ...poItems,
      {
        medicineId: med._id || (med.id as string),
        medicineName: med.name,
        quantity: med.reorderQuantity || 50,
        unitPrice: med.purchasePrice || 0,
        expectedBatchNumber: '',
      },
    ]);
  };

  // Submit Create PO
  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Supplier Required', 'Please select a supplier distributor.', 'warning');
      return;
    }
    if (poItems.length === 0) {
      showToast('Items Required', 'Please add at least one medicine item to order.', 'warning');
      return;
    }

    setCreateSubmitting(true);
    try {
      await purchaseApi.createPurchaseOrder({
        supplierId: selectedSupplierId,
        expectedDeliveryDate: poExpectedDate || undefined,
        notes: poNotes,
        items: poItems.map((i) => ({
          medicineId: i.medicineId,
          quantityOrdered: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          expectedBatchNumber: i.expectedBatchNumber,
        })),
      });

      setFeedbackMsg({ type: 'success', text: 'Purchase order created successfully!' });
      showToast('PO Created', 'Purchase order created and queued for delivery.', 'success');
      setPoItems([]);
      setSelectedSupplierId('');
      setPoNotes('');
      setActiveTab('orders');
      fetchData();
    } catch (err: any) {
      const msg = err?.toString() || 'Failed to create purchase order.';
      setFeedbackMsg({ type: 'error', text: msg });
      showToast('Error', msg, 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Received</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Partial</span>;
      case 'ORDERED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 flex items-center gap-1"><Truck className="w-3 h-3" /> Ordered</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-pharmagreen-600" />
            Purchases & Restocking Management
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Procure stock from suppliers, receive batch shipments, enter actual lot numbers, and track purchase price trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'create' ? 'secondary' : 'primary'}
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveTab(activeTab === 'create' ? 'orders' : 'create')}
            className="text-xs"
          >
            {activeTab === 'create' ? 'View Purchase Orders' : '+ New Purchase Order'}
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-gray-500 hover:text-gray-800"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-brand-border gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'orders' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          Purchase Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'create' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          Create Purchase Order
        </button>
        <button
          onClick={() => setActiveTab('prices')}
          className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'prices' ? 'border-pharmagreen-600 text-pharmagreen-700' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
        >
          Supplier Price Trends ({priceHistory.length})
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-brand-border">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search PO #, supplier, medicine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAF9] border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-brand-muted flex items-center gap-1"><Filter className="w-3 h-3" /> Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ORDERED">Ordered</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="RECEIVED">Received (Fulfilled)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-brand-muted">Loading purchase orders...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center">
              <EmptyState
                title="No Purchase Orders"
                description="Create a purchase order to order stock from your registered distributors and suppliers."
                actionText="+ Create First Purchase Order"
                onAction={() => setActiveTab('create')}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-3">PO Number</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Ordered Date</th>
                      <th className="px-4 py-3">Items Ordered</th>
                      <th className="px-4 py-3">Total Cost</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {orders.map((po) => (
                      <tr key={po._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{po.orderNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            {po.supplierName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-brand-muted">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(po.orderDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] space-y-0.5 max-w-xs">
                            {po.items.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-gray-700">
                                <span className="truncate">{it.medicineName}:</span>
                                <span className="font-semibold text-gray-900 ml-2">
                                  {it.quantityReceived || 0} / {it.quantityOrdered} units
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">₹{po.totalAmount?.toLocaleString()}</td>
                        <td className="px-4 py-3">{getStatusBadge(po.status)}</td>
                        <td className="px-4 py-3 text-right">
                          {po.status !== 'RECEIVED' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<PackageCheck className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenReceiveModal(po)}
                              className="text-[11px] py-1 px-2.5"
                            >
                              Receive Shipment
                            </Button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Stock Inwarded
                            </span>
                          )}
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

      {/* TAB 2: CREATE PURCHASE ORDER FORM */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreatePo} className="bg-white rounded-xl border border-brand-border p-6 space-y-6 max-w-4xl shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Create Restocking Purchase Order</h2>
            <p className="text-xs text-brand-muted mt-0.5">
              Select an authorized supplier and list the medicine quantities to order.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Select Supplier *</label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name} (Lead time: ~{s.leadTimeDays || 3} days)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={poExpectedDate}
                onChange={(e) => setPoExpectedDate(e.target.value)}
                className="w-full text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
              />
            </div>
          </div>

          {/* Add Medicines Picker */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800">Medicines in Order ({poItems.length})</label>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    handleAddPoItem(e.target.value);
                    e.target.value = '';
                  }}
                  className="text-xs bg-[#F8FAF9] border border-brand-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                >
                  <option value="">+ Add Medicine to PO...</option>
                  {medicines.map((m) => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.name} ({m.dosageForm} - Current Stock: {m.totalStock})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {poItems.length === 0 ? (
              <div className="p-8 border border-dashed border-brand-border rounded-xl text-center text-xs text-brand-muted">
                No items added yet. Use the dropdown above to add medicines from your catalog.
              </div>
            ) : (
              <div className="border border-brand-border rounded-xl overflow-hidden divide-y divide-brand-border">
                {poItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#F8FAF9]/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="font-semibold text-gray-900 w-full sm:w-1/3 truncate">
                      {item.medicineName}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-2/3 justify-end">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-brand-muted">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...poItems];
                            newItems[idx].quantity = Number(e.target.value);
                            setPoItems(newItems);
                          }}
                          className="w-18 bg-white border border-brand-border rounded px-2 py-1 text-center font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-brand-muted">Cost (₹):</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newItems = [...poItems];
                            newItems[idx].unitPrice = Number(e.target.value);
                            setPoItems(newItems);
                          }}
                          className="w-20 bg-white border border-brand-border rounded px-2 py-1 text-right font-mono"
                        />
                      </div>

                      <div className="w-20 text-right font-bold font-mono text-gray-900">
                        ₹{(item.quantity * item.unitPrice).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-emerald-50/50 flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>Estimated Total Purchase Value:</span>
                  <span className="text-sm text-pharmagreen-800 font-mono">
                    ₹{poItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Notes / Special Instructions</label>
            <textarea
              rows={2}
              placeholder="e.g. Urgent cold storage required, deliver by morning shift..."
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              className="w-full text-xs bg-[#F8FAF9] border border-brand-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-brand-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('orders')}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={createSubmitting}
              icon={<Truck className="w-4 h-4" />}
              className="text-xs"
            >
              Issue Purchase Order
            </Button>
          </div>
        </form>
      )}

      {/* TAB 3: SUPPLIER PRICE COMPARISON */}
      {activeTab === 'prices' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-brand-border p-4 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pharmagreen-600" />
              Supplier Purchase Price History & Comparison
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              Historical purchase costs across different deliveries. Use this to compare supplier rates over time.
            </p>
          </div>

          {priceHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-muted">
              No historical purchase price records yet. Receiving purchase order shipments will automatically populate price records.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-brand-muted font-semibold border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Batch Lot</th>
                    <th className="px-4 py-3">Unit Purchase Price</th>
                    <th className="px-4 py-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {priceHistory.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-brand-muted">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.medicineName}</td>
                      <td className="px-4 py-3 text-gray-800">{p.supplierName}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{p.batchNumber || 'N/A'}</td>
                      <td className="px-4 py-3 font-bold font-mono text-pharmagreen-800">₹{p.price?.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{p.invoiceNumber || 'PO Receipt'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECEIVING SHIPMENT MODAL */}
      {receivingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-brand-border w-full max-w-3xl p-6 text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-pharmagreen-600" />
                  Receive Shipment for {receivingOrder.orderNumber}
                </h2>
                <p className="text-[11px] text-brand-muted">
                  Supplier: <strong>{receivingOrder.supplierName}</strong> • Verify physical delivery, enter actual batch numbers and expiry dates.
                </p>
              </div>
              <button onClick={() => setReceivingOrder(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAF9] p-3 rounded-lg border border-brand-border">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Supplier Invoice / DC #</label>
                <input
                  type="text"
                  placeholder="e.g. INV-SUP-2026-889"
                  value={receiveInvoiceRef}
                  onChange={(e) => setReceiveInvoiceRef(e.target.value)}
                  className="w-full text-xs bg-white border border-brand-border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Delivery Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Good condition, temperature verification passed"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-brand-border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pharmagreen-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                Received Medication Lots (Actual Batch & Expiry Entry):
              </label>

              <div className="space-y-3">
                {receivedLots.map((lot, idx) => (
                  <div key={idx} className="p-3.5 bg-white border border-brand-border rounded-lg shadow-2xs space-y-2">
                    <div className="font-bold text-gray-900 text-xs">
                      {lot.medicineName}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-500 block text-[10px] mb-0.5">Actual Batch #:</span>
                        <input
                          type="text"
                          required
                          value={lot.batchNumber}
                          onChange={(e) => {
                            const newLots = [...receivedLots];
                            newLots[idx].batchNumber = e.target.value;
                            setReceivedLots(newLots);
                          }}
                          className="w-full bg-[#F8FAF9] border border-brand-border rounded px-2 py-1 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[10px] mb-0.5">Quantity Received:</span>
                        <input
                          type="number"
                          required
                          min="1"
                          value={lot.quantityReceived}
                          onChange={(e) => {
                            const newLots = [...receivedLots];
                            newLots[idx].quantityReceived = Number(e.target.value);
                            setReceivedLots(newLots);
                          }}
                          className="w-full bg-[#F8FAF9] border border-brand-border rounded px-2 py-1 font-bold text-pharmagreen-800"
                        />
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[10px] mb-0.5">Expiry Date:</span>
                        <input
                          type="date"
                          required
                          value={lot.expiryDate}
                          onChange={(e) => {
                            const newLots = [...receivedLots];
                            newLots[idx].expiryDate = e.target.value;
                            setReceivedLots(newLots);
                          }}
                          className="w-full bg-[#F8FAF9] border border-brand-border rounded px-2 py-1"
                        />
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[10px] mb-0.5">Purchase Cost (₹):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={lot.purchasePrice}
                          onChange={(e) => {
                            const newLots = [...receivedLots];
                            newLots[idx].purchasePrice = Number(e.target.value);
                            setReceivedLots(newLots);
                          }}
                          className="w-full bg-[#F8FAF9] border border-brand-border rounded px-2 py-1 font-mono"
                        />
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[10px] mb-0.5">Selling MRP (₹):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={lot.sellingPrice}
                          onChange={(e) => {
                            const newLots = [...receivedLots];
                            newLots[idx].sellingPrice = Number(e.target.value);
                            setReceivedLots(newLots);
                          }}
                          className="w-full bg-[#F8FAF9] border border-brand-border rounded px-2 py-1 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceivingOrder(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={receiveSubmitting}
                icon={<PackageCheck className="w-4 h-4" />}
                onClick={handleConfirmReceive}
                className="text-xs"
              >
                Confirm Receipt & Inward to Batches
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PurchasesPage;
