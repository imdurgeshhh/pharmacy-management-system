import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../config/axios';
import useStore from '../store/useStore';
import {
  TrendingUp, ShoppingCart, Plus, X, Search, Trash2,
  Package, User, Calendar, DollarSign, ChevronRight,
  AlertCircle, Download, FileSpreadsheet, FileText,
  Save, CheckCircle2, Hash
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─── Utilities ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const today = () => new Date().toISOString().slice(0, 10);

const validateGST = (val) => !val || GST_REGEX.test(val.toUpperCase());

// ─── Export Helpers ────────────────────────────────────────────────────────────

/** Download data as Excel (.xlsx) */
const exportExcel = (rows, columns, filename) => {
  const sheetData = [columns.map(c => c.label), ...rows.map(r => columns.map(c => r[c.key] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/** Download data as PDF using jsPDF */
const exportPDF = (rows, columns, title, filename, accentRgb) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFillColor(...accentRgb);
  doc.rect(0, 0, doc.internal.pageSize.width, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 24);
  doc.setTextColor(60, 60, 60);

  autoTable(doc, {
    startY: 46,
    head: [columns.map(c => c.label)],
    body: rows.map(r => columns.map(c => r[c.key] ?? '')),
    headStyles: {
      fillColor: accentRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { cellPadding: 6 },
  });

  doc.save(`${filename}.pdf`);
};

// ─── Reusable: Confirm Dialog ─────────────────────────────────────────────────
const ConfirmDialog = ({ open, message, onYes, onNo }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 mx-auto mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h3 className="text-center text-lg font-display font-bold text-gray-800 mb-2">Confirm Delete</h3>
          <p className="text-center text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onNo}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
          >
            No, Keep It
          </button>
          <button
            onClick={onYes}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-95 transition-all"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reusable: Modal ──────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, gradient, children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: '93vh', overflowY: 'auto' }}
      >
        <div className={`px-6 py-4 flex items-center justify-between ${gradient}`}>
          <h3 className="text-base font-display font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ─── Reusable: Download Menu ──────────────────────────────────────────────────
const DownloadMenu = ({ onPDF, onExcel, label = 'Download List' }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-current hover:bg-current/5 transition-all"
      >
        <Download size={14} /> {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-40 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => { onExcel(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet size={15} className="text-green-600" /> Excel (.xlsx)
            </button>
            <button
              onClick={() => { onPDF(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileText size={15} className="text-red-500" /> PDF (.pdf)
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Reusable: Summary Card ───────────────────────────────────────────────────
const SummaryCard = ({ total, label, icon: Icon, colorClass, bgClass }) => (
  <div className={`rounded-xl p-4 flex items-center gap-4 ${bgClass} border`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} shadow-lg`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-2xl font-display font-bold text-gray-800">{fmt(total)}</p>
    </div>
  </div>
);

// ─── GST Input w/ validation indicator ───────────────────────────────────────
const GSTInput = ({ value, onChange, name, accentFocus }) => {
  const valid = validateGST(value);
  const hasInput = value && value.length > 0;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        <Hash size={13} /> GST Number
        <span className="normal-case font-medium text-gray-400 ml-1">(optional)</span>
      </label>
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={onChange}
          maxLength={15}
          placeholder="22AAAAA0000A1Z5"
          className={`input-field text-sm pr-9 uppercase tracking-widest font-mono ${!valid ? 'border-red-400 focus:ring-red-300' : ''}`}
          style={{ letterSpacing: '0.08em' }}
        />
        {hasInput && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {valid
              ? <CheckCircle2 size={16} className="text-green-500" />
              : <AlertCircle size={16} className="text-red-400" />}
          </div>
        )}
      </div>
      {hasInput && !valid && (
        <p className="text-xs text-red-500 font-medium">
          Invalid GST format. Expected: 22AAAAA0000A1Z5
        </p>
      )}
      {hasInput && valid && value.length === 15 && (
        <p className="text-xs text-green-600 font-medium">✓ Valid Indian GST number</p>
      )}
    </div>
  );
};

// ─── Row Action Buttons ───────────────────────────────────────────────────────
const RowActions = ({ row, onDelete, onDownloadRow, accentColor, savedIds, onSave, canDelete = true }) => {
  const isSaved = savedIds.has(row.id);
  return (
    <div className="flex items-center gap-1.5">
      {/* Save/Confirm */}
      <button
        onClick={() => onSave(row.id)}
        title={isSaved ? 'Entry confirmed' : 'Mark as saved'}
        className={`p-1.5 rounded-lg transition-all ${isSaved
          ? 'bg-gray-100 text-gray-400 cursor-default'
          : `bg-${accentColor}-50 text-${accentColor}-600 hover:bg-${accentColor}-100`
        }`}
      >
        {isSaved ? <CheckCircle2 size={15} /> : <Save size={15} />}
      </button>

      {/* Download Row */}
      <button
        onClick={() => onDownloadRow(row)}
        title="Download this entry"
        className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
      >
        <Download size={15} />
      </button>

      {/* Delete — only visible to admin */}
      {canDelete && (
        <button
          onClick={() => onDelete(row.id)}
          title="Delete entry"
          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// WHOLESALE SALES PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const SalesPanel = () => {
  const isAdmin = useStore(state => state.isAdmin);
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [form, setForm] = useState({
    medicine_name: '', quantity: '', price_per_unit: '',
    gst_number: '', shopkeeper_name: '', sale_date: today()
  });
  const [gstError, setGstError] = useState('');

  const SALE_COLUMNS = [
    { key: 'medicine_name', label: 'Medicine Name' },
    { key: 'quantity', label: 'Qty Sold' },
    { key: 'price_per_unit', label: 'Price/Unit (₹)' },
    { key: 'gst_number', label: 'GST No.' },
    { key: 'total_amount', label: 'Total (₹)' },
    { key: 'shopkeeper_name', label: 'Shopkeeper' },
    { key: 'sale_date_fmt', label: 'Date' },
  ];

  const fetchSales = useCallback(async () => {
    try {
      const res = await api.get('/wholesale/sales');
      setSales(res.data);
    } catch (err) {
      console.error('Failed to fetch wholesale sales:', err);
    }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter(s =>
      s.medicine_name?.toLowerCase().includes(q) ||
      s.shopkeeper_name?.toLowerCase().includes(q) ||
      fmtDate(s.sale_date).toLowerCase().includes(q) ||
      (s.gst_number || '').toLowerCase().includes(q)
    );
  }, [sales, search]);

  const total = useMemo(() => sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0), [sales]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'gst_number') {
      const upper = value.toUpperCase();
      setForm(p => ({ ...p, gst_number: upper }));
      if (upper && !validateGST(upper)) setGstError('Invalid GST format');
      else setGstError('');
      return;
    }
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.gst_number && !validateGST(form.gst_number)) {
      setGstError('Please enter a valid 15-character Indian GST number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/wholesale/sales', form);
      setForm({ medicine_name: '', quantity: '', price_per_unit: '', gst_number: '', shopkeeper_name: '', sale_date: today() });
      setGstError('');
      setModalOpen(false);
      fetchSales();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add sale');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => setConfirmId(id);

  const confirmDelete = async () => {
    try {
      await api.delete(`/wholesale/sales/${confirmId}`);
      setSales(p => p.filter(s => s.id !== confirmId));
      setSavedIds(p => { const n = new Set(p); n.delete(confirmId); return n; });
    } catch { alert('Failed to delete'); }
    finally { setConfirmId(null); }
  };

  const handleSave = (id) => setSavedIds(p => new Set([...p, id]));

  // Row-level PDF download
  const downloadRow = (row) => {
    const data = [{ ...row, sale_date_fmt: fmtDate(row.sale_date), price_per_unit: fmt(row.price_per_unit), total_amount: fmt(row.total_amount) }];
    exportPDF(data, SALE_COLUMNS, 'Wholesale Sale Entry', `WS-Sale-${row.id}`, [37, 99, 235]);
  };

  // Full list exports
  const rowsForExport = filtered.map(r => ({
    ...r,
    sale_date_fmt: fmtDate(r.sale_date),
    price_per_unit: Number(r.price_per_unit),
    total_amount: Number(r.total_amount),
  }));

  const preview = Number(form.quantity) * Number(form.price_per_unit) || 0;

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#60a5fa 100%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <TrendingUp size={18} className="text-blue-200" />
              <h2 className="text-base font-display font-bold text-white">Wholesale Sales</h2>
            </div>
            <p className="text-xs text-blue-200">Medicines sold to other shopkeepers</p>
          </div>
          <DownloadMenu
            label="Download List"
            onExcel={() => exportExcel(rowsForExport, SALE_COLUMNS, 'Wholesale_Sales')}
            onPDF={() => exportPDF(rowsForExport, SALE_COLUMNS, 'Wholesale Sales Report', 'Wholesale_Sales_Report', [37, 99, 235])}
          />
        </div>
        <style>{`.sales-dl { color: white; border-color: rgba(255,255,255,0.4); }`}</style>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-blue-50/30 p-3 gap-3">
        {/* Summary */}
        <SummaryCard total={total} label="Total Sales Amount" icon={TrendingUp} colorClass="bg-blue-600" bgClass="bg-white border-blue-100" />

        {/* Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medicine, shopkeeper, GST, date…"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 transition-all"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={14} /> Add Sale
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-blue-100 bg-white shadow-sm no-scrollbar">
          <table className="w-full text-left text-xs border-collapse" style={{ minWidth: '680px' }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-600 text-white text-xs uppercase tracking-wider">
                {['Medicine Name', 'Qty', 'Price/Unit', 'GST No.', 'Total', 'Shopkeeper', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertCircle size={28} />
                      <p className="text-xs font-medium">No wholesale sales found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s.id} className={`hover:bg-blue-50/70 transition-colors ${i % 2 === 1 ? 'bg-blue-50/20' : ''}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[130px] truncate" title={s.medicine_name}>{s.medicine_name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.quantity}</td>
                    <td className="px-3 py-2.5 text-gray-600">{fmt(s.price_per_unit)}</td>
                    <td className="px-3 py-2.5">
                      {s.gst_number
                        ? <span className="font-mono text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-100">{s.gst_number}</span>
                        : <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-blue-700">{fmt(s.total_amount)}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[110px] truncate" title={s.shopkeeper_name}>{s.shopkeeper_name}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(s.sale_date)}</td>
                    <td className="px-3 py-2.5">
                      <RowActions
                        row={s}
                        onDelete={handleDelete}
                        onDownloadRow={downloadRow}
                        onSave={handleSave}
                        savedIds={savedIds}
                        accentColor="blue"
                        canDelete={isAdmin()}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Wholesale Sale" gradient="bg-gradient-to-r from-blue-700 to-blue-500">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Package size={13} />Medicine Name *</label>
            <input name="medicine_name" required value={form.medicine_name} onChange={handleChange}
              placeholder="e.g. Paracetamol 500mg" className="input-field text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity Sold *</label>
              <input name="quantity" required type="number" min="1" value={form.quantity} onChange={handleChange}
                placeholder="e.g. 100" className="input-field text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12} />Price/Unit *</label>
              <input name="price_per_unit" required type="number" min="0" step="0.01" value={form.price_per_unit} onChange={handleChange}
                placeholder="₹0.00" className="input-field text-sm" />
            </div>
          </div>

          {preview > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-blue-600 font-medium">Total Amount</span>
              <span className="text-xl font-display font-bold text-blue-700">{fmt(preview)}</span>
            </div>
          )}

          <GSTInput name="gst_number" value={form.gst_number} onChange={handleChange} accentFocus="blue" />
          {gstError && <p className="text-xs text-red-500 -mt-2 font-medium">{gstError}</p>}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><User size={13} />Shopkeeper Name *</label>
            <input name="shopkeeper_name" required value={form.shopkeeper_name} onChange={handleChange}
              placeholder="e.g. Sharma Medical Store" className="input-field text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={13} />Sale Date</label>
            <input name="sale_date" type="date" value={form.sale_date} onChange={handleChange} className="input-field text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Saving…' : <><ChevronRight size={16} />Save Sale</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmId !== null}
        message="Are you sure you want to delete this entry? This action cannot be undone."
        onYes={confirmDelete}
        onNo={() => setConfirmId(null)}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// WHOLESALE PURCHASES PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const PurchasesPanel = () => {
  const isAdmin = useStore(state => state.isAdmin);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [form, setForm] = useState({
    medicine_name: '', quantity: '', price_per_unit: '',
    gst_number: '', supplier_name: '', purchase_date: today()
  });
  const [gstError, setGstError] = useState('');

  const PURCHASE_COLUMNS = [
    { key: 'medicine_name', label: 'Medicine Name' },
    { key: 'quantity', label: 'Qty Purchased' },
    { key: 'price_per_unit', label: 'Price/Unit (₹)' },
    { key: 'gst_number', label: 'GST No.' },
    { key: 'total_amount', label: 'Total (₹)' },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'purchase_date_fmt', label: 'Date' },
  ];

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await api.get('/wholesale/purchases');
      setPurchases(res.data);
    } catch (err) {
      console.error('Failed to fetch wholesale purchases:', err);
    }
  }, []);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return purchases.filter(p =>
      p.medicine_name?.toLowerCase().includes(q) ||
      p.supplier_name?.toLowerCase().includes(q) ||
      fmtDate(p.purchase_date).toLowerCase().includes(q) ||
      (p.gst_number || '').toLowerCase().includes(q)
    );
  }, [purchases, search]);

  const total = useMemo(() => purchases.reduce((acc, p) => acc + Number(p.total_amount || 0), 0), [purchases]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'gst_number') {
      const upper = value.toUpperCase();
      setForm(p => ({ ...p, gst_number: upper }));
      if (upper && !validateGST(upper)) setGstError('Invalid GST format');
      else setGstError('');
      return;
    }
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.gst_number && !validateGST(form.gst_number)) {
      setGstError('Please enter a valid 15-character Indian GST number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/wholesale/purchases', form);
      setForm({ medicine_name: '', quantity: '', price_per_unit: '', gst_number: '', supplier_name: '', purchase_date: today() });
      setGstError('');
      setModalOpen(false);
      fetchPurchases();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => setConfirmId(id);

  const confirmDelete = async () => {
    try {
      await api.delete(`/wholesale/purchases/${confirmId}`);
      setPurchases(p => p.filter(x => x.id !== confirmId));
      setSavedIds(p => { const n = new Set(p); n.delete(confirmId); return n; });
    } catch { alert('Failed to delete'); }
    finally { setConfirmId(null); }
  };

  const handleSave = (id) => setSavedIds(p => new Set([...p, id]));

  const downloadRow = (row) => {
    const data = [{ ...row, purchase_date_fmt: fmtDate(row.purchase_date), price_per_unit: fmt(row.price_per_unit), total_amount: fmt(row.total_amount) }];
    exportPDF(data, PURCHASE_COLUMNS, 'Wholesale Purchase Entry', `WS-Purchase-${row.id}`, [22, 163, 74]);
  };

  const rowsForExport = filtered.map(r => ({
    ...r,
    purchase_date_fmt: fmtDate(r.purchase_date),
    price_per_unit: Number(r.price_per_unit),
    total_amount: Number(r.total_amount),
  }));

  const preview = Number(form.quantity) * Number(form.price_per_unit) || 0;

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,#166534 0%,#16a34a 55%,#4ade80 100%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ShoppingCart size={18} className="text-green-200" />
              <h2 className="text-base font-display font-bold text-white">Wholesale Purchase</h2>
            </div>
            <p className="text-xs text-green-200">Medicines bought for your shop</p>
          </div>
          <DownloadMenu
            label="Download List"
            onExcel={() => exportExcel(rowsForExport, PURCHASE_COLUMNS, 'Wholesale_Purchases')}
            onPDF={() => exportPDF(rowsForExport, PURCHASE_COLUMNS, 'Wholesale Purchases Report', 'Wholesale_Purchases_Report', [22, 163, 74])}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-green-50/30 p-3 gap-3">
        {/* Summary */}
        <SummaryCard total={total} label="Total Purchase Amount" icon={ShoppingCart} colorClass="bg-green-600" bgClass="bg-white border-green-100" />

        {/* Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medicine, supplier, GST, date…"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-green-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-400 transition-all"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-xl bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={14} /> Add Purchase
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-green-100 bg-white shadow-sm no-scrollbar">
          <table className="w-full text-left text-xs border-collapse" style={{ minWidth: '680px' }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-green-600 text-white text-xs uppercase tracking-wider">
                {['Medicine Name', 'Qty', 'Price/Unit', 'GST No.', 'Total', 'Supplier', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-green-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertCircle size={28} />
                      <p className="text-xs font-medium">No wholesale purchases found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.id} className={`hover:bg-green-50/70 transition-colors ${i % 2 === 1 ? 'bg-green-50/20' : ''}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[130px] truncate" title={p.medicine_name}>{p.medicine_name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{p.quantity}</td>
                    <td className="px-3 py-2.5 text-gray-600">{fmt(p.price_per_unit)}</td>
                    <td className="px-3 py-2.5">
                      {p.gst_number
                        ? <span className="font-mono text-[11px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md border border-green-100">{p.gst_number}</span>
                        : <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-green-700">{fmt(p.total_amount)}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[110px] truncate" title={p.supplier_name}>{p.supplier_name}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(p.purchase_date)}</td>
                    <td className="px-3 py-2.5">
                      <RowActions
                        row={p}
                        onDelete={handleDelete}
                        onDownloadRow={downloadRow}
                        onSave={handleSave}
                        savedIds={savedIds}
                        accentColor="green"
                        canDelete={isAdmin()}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Wholesale Purchase" gradient="bg-gradient-to-r from-green-800 to-green-500">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Package size={13} />Medicine Name *</label>
            <input name="medicine_name" required value={form.medicine_name} onChange={handleChange}
              placeholder="e.g. Amoxicillin 250mg" className="input-field text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Qty Purchased *</label>
              <input name="quantity" required type="number" min="1" value={form.quantity} onChange={handleChange}
                placeholder="e.g. 500" className="input-field text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12} />Price/Unit *</label>
              <input name="price_per_unit" required type="number" min="0" step="0.01" value={form.price_per_unit} onChange={handleChange}
                placeholder="₹0.00" className="input-field text-sm" />
            </div>
          </div>

          {preview > 0 && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-green-700 font-medium">Total Amount</span>
              <span className="text-xl font-display font-bold text-green-700">{fmt(preview)}</span>
            </div>
          )}

          <GSTInput name="gst_number" value={form.gst_number} onChange={handleChange} accentFocus="green" />
          {gstError && <p className="text-xs text-red-500 -mt-2 font-medium">{gstError}</p>}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><User size={13} />Supplier Name *</label>
            <input name="supplier_name" required value={form.supplier_name} onChange={handleChange}
              placeholder="e.g. MedLife Wholesalers" className="input-field text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={13} />Purchase Date</label>
            <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} className="input-field text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Saving…' : <><ChevronRight size={16} />Save Purchase</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmId !== null}
        message="Are you sure you want to delete this entry? This action cannot be undone."
        onYes={confirmDelete}
        onNo={() => setConfirmId(null)}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Suppliers = () => {
  return (
    <div className="animate-fade-in relative z-10 lg:pl-4 flex flex-col gap-5" style={{ minHeight: 0 }}>

      {/* Page Title */}
      <div>
        <h1 className="h2-fluid tracking-tight text-gray-800 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-green-500 shadow-lg flex-shrink-0">
            <Package size={22} className="text-white" />
          </span>
          Supplier Management
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-1 ml-1">
          Track wholesale sales to shopkeepers and purchases from suppliers — with GST, PDF &amp; Excel exports.
        </p>
      </div>

      {/* Dual-panel */}
      <div
        className="flex rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white"
        style={{ minHeight: '78vh' }}
      >
        {/* Left — Sales (Blue) */}
        <div className="flex flex-col overflow-hidden" style={{ flex: '1 1 50%', minWidth: 0 }}>
          <SalesPanel />
        </div>

        {/* Divider */}
        <div className="relative flex-shrink-0" style={{ width: '5px' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500 via-violet-400 to-green-500 opacity-50" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20
                       w-9 h-9 rounded-full bg-white border-2 border-violet-300 shadow-lg
                       flex items-center justify-center"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-500 to-green-500" />
          </div>
        </div>

        {/* Right — Purchases (Green) */}
        <div className="flex flex-col overflow-hidden" style={{ flex: '1 1 50%', minWidth: 0 }}>
          <PurchasesPanel />
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
