import React, { useState } from 'react';
import {
  TrendingUp, Plus, Search, Trash2,
  AlertCircle, Download, FileSpreadsheet, FileText,
  Save, CheckCircle2
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../../utils/exportData';
import ConfirmModal from '../common/ConfirmModal';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Summary Card
const SummaryCard = ({ total, label, icon: Icon, colorClass, bgClass }) => (
  <div className={`rounded-xl p-4 flex items-center gap-4 ${bgClass} border`}>
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass} shadow-lg`}>
      <Icon size={22} className="text-white" aria-hidden="true" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-700">{label}</p>
      <p className="text-2xl font-display font-bold text-gray-800 tabular-nums">{fmt(total)}</p>
    </div>
  </div>
);

// Download Menu Dropdown
const DownloadMenu = ({ onPDF, onExcel, label = 'Download List' }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-900/90 hover:bg-blue-950 text-white border border-blue-700/80 shadow-sm transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Download size={14} aria-hidden="true" /> {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-1 z-40 w-40 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden animate-dropdown-enter" role="menu">
            <button
              role="menuitem"
              onClick={() => { onExcel(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-[background-color] focus-visible:outline-none focus-visible:bg-gray-100"
            >
              <FileSpreadsheet size={15} className="text-green-600" aria-hidden="true" /> Excel (.xlsx)
            </button>
            <button
              role="menuitem"
              onClick={() => { onPDF(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-[background-color] focus-visible:outline-none focus-visible:bg-gray-100"
            >
              <FileText size={15} className="text-red-500" aria-hidden="true" /> PDF (.pdf)
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Row Action Buttons
const RowActions = ({ row, onDelete, onDownloadRow, savedIds, onSave, canDelete }) => {
  const isSaved = savedIds.has(row.id);
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSave(row.id)}
        title={isSaved ? 'Entry confirmed' : 'Mark as saved'}
        aria-label={isSaved ? 'Entry confirmed' : 'Mark entry as saved'}
        className={`relative p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          isSaved ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
        }`}
      >
        {isSaved ? <CheckCircle2 size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
      </button>

      <button
        type="button"
        onClick={() => onDownloadRow(row)}
        title="Download this entry"
        aria-label="Download this entry as PDF"
        className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Download size={15} aria-hidden="true" />
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(row.id)}
          title="Delete entry"
          aria-label="Delete this entry"
          className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

const WholesaleSalesTable = ({
  sales = [],
  search = '',
  onSearchChange,
  onOpenAddModal,
  onDeleteSale,
  isAdmin = false,
}) => {
  const [confirmId, setConfirmId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  const SALE_COLUMNS = [
    { key: 'medicine_name', label: 'Medicine Name' },
    { key: 'quantity', label: 'Qty Sold' },
    { key: 'price_per_unit', label: 'Price/Unit (INR)' },
    { key: 'gst_number', label: 'GST No.' },
    { key: 'total_amount', label: 'Total (INR)' },
    { key: 'shopkeeper_name', label: 'Shopkeeper' },
    { key: 'sale_date_fmt', label: 'Date' },
  ];

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    return (
      s.medicine_name?.toLowerCase().includes(q) ||
      s.shopkeeper_name?.toLowerCase().includes(q) ||
      fmtDate(s.sale_date).toLowerCase().includes(q) ||
      (s.gst_number || '').toLowerCase().includes(q)
    );
  });

  const total = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

  const handleSave = (id) => setSavedIds(p => new Set([...p, id]));

  const downloadRow = (row) => {
    const data = [{
      ...row,
      sale_date_fmt: fmtDate(row.sale_date),
      price_per_unit: fmt(row.price_per_unit),
      total_amount: fmt(row.total_amount)
    }];
    exportToPDF(data, SALE_COLUMNS, 'Wholesale Sale Entry', `WS-Sale-${row.id}`, [37, 99, 235]);
  };

  const rowsForExport = filtered.map(r => ({
    ...r,
    sale_date_fmt: fmtDate(r.sale_date),
    price_per_unit: Number(r.price_per_unit),
    total_amount: Number(r.total_amount),
  }));

  const handleConfirmDelete = async () => {
    if (confirmId) {
      await onDeleteSale(confirmId);
      setConfirmId(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#60a5fa 100%)' }}>
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <TrendingUp size={18} className="text-blue-100" aria-hidden="true" />
              <h2 className="text-base font-display font-bold text-white text-balance">Wholesale Sales</h2>
            </div>
            <p className="text-xs font-medium text-blue-100">Medicines sold to other shopkeepers</p>
          </div>
          <DownloadMenu
            label="Download List"
            onExcel={() => exportToExcel(rowsForExport, SALE_COLUMNS, 'Wholesale_Sales')}
            onPDF={() => exportToPDF(rowsForExport, SALE_COLUMNS, 'Wholesale Sales Report', 'Wholesale_Sales_Report', [37, 99, 235])}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-blue-50/30 p-3 gap-3">
        {/* Summary Card */}
        <SummaryCard total={total} label="Total Sales Amount" icon={TrendingUp} colorClass="bg-blue-600" bgClass="bg-white border-blue-100" />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="wholesale-sales-search"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Search Wholesale Sales
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                id="wholesale-sales-search"
                name="search"
                autoComplete="off"
                spellCheck={false}
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search medicine, shopkeeper, GST, date…"
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-blue-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 placeholder-gray-400 transition-[border-color,box-shadow]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="h-[34px] flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-[0.96] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 whitespace-nowrap self-stretch sm:self-end"
          >
            <Plus size={14} aria-hidden="true" /> Add Sale
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-blue-100 bg-white shadow-sm no-scrollbar" tabIndex={0} role="region" aria-label="Wholesale sales table">
          <table className="w-full text-left text-xs border-collapse" style={{ minWidth: '680px' }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-600 text-white text-xs uppercase tracking-wider">
                {['Medicine Name', 'Qty', 'Price/Unit', 'GST No.', 'Total', 'Shopkeeper', 'Date', 'Actions'].map(h => (
                  <th key={h} scope="col" className="px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertCircle size={28} aria-hidden="true" />
                      <p className="text-xs font-medium">No wholesale sales found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s.id} className={`hover:bg-blue-50/70 transition-colors ${i % 2 === 1 ? 'bg-blue-50/20' : ''}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[130px] truncate" title={s.medicine_name}>{s.medicine_name}</td>
                    <td className="px-3 py-2.5 text-gray-600 tabular-nums">{s.quantity}</td>
                    <td className="px-3 py-2.5 text-gray-600 tabular-nums">{fmt(s.price_per_unit)}</td>
                    <td className="px-3 py-2.5">
                      {s.gst_number
                        ? <span className="font-mono text-[11px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded-md border border-blue-100">{s.gst_number}</span>
                        : <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-blue-700 tabular-nums">{fmt(s.total_amount)}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[110px] truncate" title={s.shopkeeper_name}>{s.shopkeeper_name}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap tabular-nums">{fmtDate(s.sale_date)}</td>
                    <td className="px-3 py-2.5">
                      <RowActions
                        row={s}
                        onDelete={id => setConfirmId(id)}
                        onDownloadRow={downloadRow}
                        onSave={handleSave}
                        savedIds={savedIds}
                        canDelete={isAdmin}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmModal
        isOpen={confirmId !== null}
        title="Delete Wholesale Sale?"
        message="Are you sure you want to delete this sale entry? This action cannot be undone."
        confirmLabel="Delete Sale"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default WholesaleSalesTable;
