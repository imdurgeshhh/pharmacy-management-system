import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../config/axios';
import useStore from '../store/useStore';
import {
  ShoppingCart, User, Phone, Hash, Stethoscope, FileText, Calendar,
  Plus, Trash2, Edit3, Check, X, Download, Save, XCircle,
  Search, ChevronDown, AlertCircle, CheckCircle2, ToggleLeft, ToggleRight,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Constants ─────────────────────────────────────────────────────────────────
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Credit'];
const SHOP = {
  name: 'PharmaCare Medical Store',
  address: '123, MG Road, Health District, City - 560001',
  gstin: '29AAAAA0000A1Z5',
  phone: '+91 98765 43210',
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => `₹${(Number(n) || 0).toFixed(2)}`;
const billNo = () => `BILL-${Date.now().toString().slice(-6)}`;

// ─── Row computation ──────────────────────────────────────────────────────────
const computeRow = (r) => {
  const mrp   = parseFloat(r.mrp)      || 0;
  const qty   = parseFloat(r.qty)      || 0;
  const gst   = parseFloat(r.gst_pct)  || 0;
  const disc  = parseFloat(r.disc_pct) || 0;
  const base     = mrp * qty;
  const disc_amt = +(base * disc / 100).toFixed(2);
  const tax_amt  = +(base * gst  / 100).toFixed(2);
  const net_amt  = +(base - disc_amt + tax_amt).toFixed(2);
  return { ...r, base, disc_amt, tax_amt, net_amt };
};

// ─── Input styles ─────────────────────────────────────────────────────────────
const iCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all placeholder-gray-400';
const tiCls = 'w-full px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-green-400 transition-all placeholder-gray-300';

// ─── Click-outside hook ───────────────────────────────────────────────────────
function useClickOutside(cb) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [cb]);
  return ref;
}

// ─── Medicine autocomplete ────────────────────────────────────────────────────
function MedicinePicker({ value, onChange, inventory, onSelect, className = iCls }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const hits = value.trim().length > 0
    ? inventory.filter(m => (m.label || '').toLowerCase().includes(value.toLowerCase())).slice(0, 7)
    : [];
  return (
    <div className="relative" ref={ref}>
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} placeholder="Medicine name…" className={className} />
      {open && hits.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-0.5 w-56 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
          {hits.map((m, i) => (
            <button key={i} type="button" onMouseDown={() => { onSelect(m); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 border-b border-gray-50 last:border-0 text-gray-800 font-medium">
              {m.label}
              {m.mrp > 0 && <span className="ml-1 text-green-600 font-bold">{fmt(m.mrp)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PDF generator ────────────────────────────────────────────────────────────
function generatePDF(customer, rows, summary, paymentMode, bNo) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.width;
  doc.setFillColor(46, 125, 50); doc.rect(0, 0, W, 65, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(SHOP.name, W / 2, 24, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(SHOP.address, W / 2, 36, { align: 'center' });
  doc.text(`GSTIN: ${SHOP.gstin}  |  Ph: ${SHOP.phone}`, W / 2, 47, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('TAX INVOICE', W / 2, 60, { align: 'center' });

  doc.setTextColor(50, 50, 50); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const y = 80;
  doc.setFont('helvetica', 'bold'); doc.text('Bill To:', 40, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer.name || 'Walk-in Customer'}`, 40, y + 12);
  doc.text(`Phone: ${customer.phone || '—'}`, 40, y + 24);
  if (customer.gst)         doc.text(`GST: ${customer.gst}`, 40, y + 36);
  if (customer.doctor)      doc.text(`Doctor: Dr. ${customer.doctor}`, 40, y + 48);
  if (customer.prescription)doc.text(`Rx No.: ${customer.prescription}`, 40, y + 60);
  doc.setFont('helvetica', 'bold');
  doc.text(`Bill No: ${bNo}`, W - 40, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${customer.bill_date || todayStr()}`, W - 40, y + 12, { align: 'right' });
  doc.text(`Payment: ${paymentMode}`, W - 40, y + 24, { align: 'right' });

  const tableY = customer.gst || customer.doctor || customer.prescription ? 152 : 118;
  autoTable(doc, {
    startY: tableY,
    head: [['#', 'Medicine', 'HSN', 'Qty', 'MRP', 'Disc%', 'Disc Amt', 'GST%', 'Tax Amt', 'Net Amt']],
    body: rows.map((r, i) => [
      i + 1, r.name, '3004', r.qty,
      fmt(r.mrp), `${r.disc_pct || 0}%`, fmt(r.disc_amt),
      `${r.gst_pct || 0}%`, fmt(r.tax_amt), fmt(r.net_amt)
    ]),
    headStyles: { fillColor: [46, 125, 50], textColor: 255, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [240, 255, 240] },
    styles: { cellPadding: 3 },
  });
  const fy = doc.lastAutoTable.finalY + 10;
  const rX = W - 40;
  doc.setFontSize(8); doc.setTextColor(80, 80, 80);
  doc.text('Subtotal:', rX - 100, fy + 12, { align: 'right' }); doc.text(fmt(summary.subtotal), rX, fy + 12, { align: 'right' });
  doc.text('Discount:', rX - 100, fy + 24, { align: 'right' }); doc.text(`- ${fmt(summary.totalDiscount)}`, rX, fy + 24, { align: 'right' });
  doc.text('GST:', rX - 100, fy + 36, { align: 'right' }); doc.text(fmt(summary.totalGST), rX, fy + 36, { align: 'right' });
  doc.setFillColor(46, 125, 50); doc.roundedRect(rX - 150, fy + 42, 152, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`Grand Total: ${fmt(summary.grandTotal)}`, rX - 74, fy + 55, { align: 'center' });
  doc.setTextColor(130, 130, 130); doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  doc.text('Thank you! Computer-generated invoice.', W / 2, doc.internal.pageSize.height - 18, { align: 'center' });
  doc.save(`Invoice_${bNo}.pdf`);
}

// ─── Empty row factory ────────────────────────────────────────────────────────
const blankRow = () => ({ name: '', qty: 1, mrp: '', gst_pct: 12, disc_pct: '', editing: true });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — Unified Single-Page Billing
// ═══════════════════════════════════════════════════════════════════════════════
export default function POS() {
  const { user } = useStore();
  const [BILL_NO] = useState(billNo);

  // ── Inventory ──────────────────────────────────────────────────────────────
  const [inventory, setInventory] = useState([]);
  useEffect(() => {
    api.get('/inventory').then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setInventory(data.map(m => ({
        id: m.id,
        inventory_id: m.id,
        label: m.name || m.medicine_name || '',
        mrp: parseFloat(m.mrp) || 0,
        stock_qty: m.total_stock || m.stock_qty || 0,
        tax_percentage: m.tax_percentage || 12,
      })).filter(m => m.label));
    }).catch(() => setInventory([]));
  }, []);

  // ── Customer ───────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState({
    name: '', phone: '', gst: '', doctor: '', prescription: '', bill_date: todayStr()
  });
  const [gstOk, setGstOk] = useState(null);
  const setC = (k, v) => {
    setCustomer(p => ({ ...p, [k]: k === 'gst' ? v.toUpperCase() : v }));
    if (k === 'gst') { const u = v.toUpperCase(); setGstOk(u.length === 0 ? null : GST_REGEX.test(u)); }
  };

  // ── Medicine rows ──────────────────────────────────────────────────────────
  const [rows, setRows] = useState([blankRow()]);

  const updateRow = (idx, field, value) =>
    setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const pickMedicine = (idx, med) => {
    setRows(p => p.map((r, i) => i === idx ? {
      ...r,
      name: med.label,
      mrp: String(med.mrp || ''),
      gst_pct: med.tax_percentage || 12,
    } : r));
  };

  const confirmRow = (idx) => updateRow(idx, 'editing', false);
  const editRow   = (idx) => updateRow(idx, 'editing', true);
  const deleteRow = (idx) => setRows(p => p.length === 1 ? [blankRow()] : p.filter((_, i) => i !== idx));

  const addRow = () => setRows(p => {
    // auto-confirm last row if it has data
    const last = p[p.length - 1];
    if (last.editing && last.name && last.qty && last.mrp) {
      return [...p.map((r, i) => i === p.length - 1 ? { ...r, editing: false } : r), blankRow()];
    }
    return [...p, blankRow()];
  });

  // ── Computed ───────────────────────────────────────────────────────────────
  const computed = useMemo(() => rows.map(computeRow), [rows]);

  // ── Payment ────────────────────────────────────────────────────────────────
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [roundOff, setRoundOff] = useState(false);

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const subtotal       = computed.reduce((s, r) => s + r.base, 0);
    const totalDiscount  = computed.reduce((s, r) => s + r.disc_amt, 0);
    const totalGST       = computed.reduce((s, r) => s + r.tax_amt, 0);
    const beforeRound    = subtotal - totalDiscount + totalGST;
    const rounded        = Math.round(beforeRound);
    const roundOff_amt   = roundOff ? +(rounded - beforeRound).toFixed(2) : 0;
    const grandTotal     = roundOff ? rounded : +beforeRound.toFixed(2);
    return { subtotal, totalDiscount, totalGST, roundOff_amt, grandTotal };
  }, [computed, roundOff]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const hasItems = rows.some(r => r.name && r.qty && r.mrp);

  const handleSave = async () => {
    if (!hasItems) return alert('Please add at least one medicine.');
    setSaving(true);
    try {
      const validRows = computed.filter(r => r.name && r.qty && r.mrp);
      const invItems = validRows.map(r => {
        const inv = inventory.find(m => m.label === r.name);
        return {
          inventory_id: inv?.inventory_id || inv?.id || 1,
          qty: parseFloat(r.qty) || 1,
          price: parseFloat(r.mrp) || 0,
          tax: r.tax_amt,
        };
      });
      await api.post('/sales', {
        customer_name: customer.name,
        customer_phone: customer.phone,
        employee_id: user?.id || 1,
        total_amount: summary.grandTotal,
        tax_amount: summary.totalGST,
        items: invItems,
      });
      alert(`✅ Bill ${BILL_NO} saved successfully!`);
      handleClear();
    } catch (err) {
      alert('Save failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = () => {
    if (!hasItems) return alert('Please add at least one medicine.');
    generatePDF(customer, computed.filter(r => r.name && r.qty && r.mrp), summary, paymentMode, BILL_NO);
  };

  const handleClear = () => {
    setCustomer({ name: '', phone: '', gst: '', doctor: '', prescription: '', bill_date: todayStr() });
    setRows([blankRow()]);
    setPaymentMode('Cash');
    setRoundOff(false);
    setGstOk(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col xl:flex-row gap-5 animate-fade-in relative z-10 lg:pl-4 pb-10">

      {/* ══════════════════ LEFT PANEL ══════════════════ */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">

        {/* Page Title */}
        <div className="flex items-center gap-3">
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-700 to-green-500 shadow-lg shrink-0">
            <ShoppingCart size={18} className="text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Customer Billing</h1>
            <p className="text-xs text-gray-500">Bill # <span className="font-mono font-bold text-green-700">{BILL_NO}</span></p>
          </div>
        </div>

        {/* ─── Customer Details (compact) ─── */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-md overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-green-700 to-green-500 flex items-center gap-2">
            <User size={15} className="text-green-200" />
            <h2 className="text-sm font-bold text-white">Customer Details</h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-1"><User size={10} />Name</label>
              <input value={customer.name} onChange={e => setC('name', e.target.value)}
                placeholder="Walk-in" className={iCls} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-1"><Phone size={10} />Phone</label>
              <input value={customer.phone} onChange={e => setC('phone', e.target.value)}
                placeholder="9876543210" className={iCls} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-1">
                <Hash size={10} />GST <span className="font-normal text-gray-400 normal-case text-xs">(opt)</span>
              </label>
              <div className="relative">
                <input value={customer.gst} onChange={e => setC('gst', e.target.value)}
                  maxLength={15} placeholder="22AAAAA0000A1Z5"
                  className={`${iCls} pr-7 font-mono text-xs uppercase tracking-widest ${gstOk === false ? 'border-red-400' : gstOk === true ? 'border-green-400' : ''}`} />
                {gstOk === true  && <CheckCircle2 size={13} className="absolute right-2.5 top-2.5 text-green-500" />}
                {gstOk === false && <AlertCircle  size={13} className="absolute right-2.5 top-2.5 text-red-400" />}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-1"><Stethoscope size={10} />Doctor <span className="font-normal text-gray-400 normal-case">(opt)</span></label>
              <input value={customer.doctor} onChange={e => setC('doctor', e.target.value)}
                placeholder="Dr. Sharma" className={iCls} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-1"><FileText size={10} />Rx No. <span className="font-normal text-gray-400 normal-case">(opt)</span></label>
              <input value={customer.prescription} onChange={e => setC('prescription', e.target.value)}
                placeholder="RX-001" className={iCls} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-1"><Calendar size={10} />Date</label>
              <input type="date" value={customer.bill_date} onChange={e => setC('bill_date', e.target.value)}
                className={iCls} />
            </div>

          </div>
        </div>

        {/* ─── Medicine Bill Table ─── */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-md overflow-hidden flex-1">
          <div className="px-5 py-3 bg-gradient-to-r from-green-700 to-green-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-green-200" />
              <h2 className="text-sm font-bold text-white">Medicine Bill</h2>
            </div>
            <button onClick={addRow}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all">
              <Plus size={13} /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 760 }}>
              <thead className="bg-green-50 border-b border-green-100 text-green-800 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold w-40">Medicine</th>
                  <th className="px-2 py-2.5 text-center font-bold w-16">Qty</th>
                  <th className="px-2 py-2.5 text-left font-bold w-20">MRP</th>
                  <th className="px-2 py-2.5 text-center font-bold w-16">GST%</th>
                  <th className="px-2 py-2.5 text-right font-bold w-20">Tax</th>
                  <th className="px-2 py-2.5 text-center font-bold w-16">Disc%</th>
                  <th className="px-2 py-2.5 text-right font-bold w-20">Disc Amt</th>
                  <th className="px-2 py-2.5 text-right font-bold w-24">Net Amt</th>
                  <th className="px-2 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {rows.map((row, idx) => {
                  const c = computed[idx];
                  const isEditing = row.editing;

                  return (
                    <tr key={idx} className={`transition-colors ${isEditing ? 'bg-green-50/60' : 'hover:bg-green-50/30'}`}>

                      {/* Medicine name */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <MedicinePicker value={row.name} onChange={v => updateRow(idx, 'name', v)}
                            inventory={inventory} onSelect={m => pickMedicine(idx, m)} className={tiCls} />
                        ) : (
                          <span className="font-semibold text-gray-800 truncate block max-w-[150px]" title={row.name}>{row.name}</span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="px-2 py-2 text-center">
                        {isEditing ? (
                          <input type="number" min="1" value={row.qty}
                            onChange={e => updateRow(idx, 'qty', e.target.value)}
                            className={`${tiCls} text-center font-bold w-16`} />
                        ) : (
                          <span className="font-bold text-gray-800">{row.qty}</span>
                        )}
                      </td>

                      {/* MRP */}
                      <td className="px-2 py-2">
                        {isEditing ? (
                          <input type="number" step="0.01" value={row.mrp}
                            onChange={e => updateRow(idx, 'mrp', e.target.value)}
                            placeholder="0.00" className={`${tiCls} w-20`} />
                        ) : (
                          <span className="text-gray-700 font-mono">{fmt(row.mrp)}</span>
                        )}
                      </td>

                      {/* GST% */}
                      <td className="px-2 py-2 text-center">
                        {isEditing ? (
                          <select value={row.gst_pct} onChange={e => updateRow(idx, 'gst_pct', e.target.value)}
                            className={`${tiCls} cursor-pointer w-16`}>
                            {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        ) : (
                          <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-md px-1.5 py-0.5 font-semibold">{row.gst_pct}%</span>
                        )}
                      </td>

                      {/* Tax amt — always computed */}
                      <td className="px-2 py-2 text-right font-mono text-orange-700">{fmt(c.tax_amt)}</td>

                      {/* Disc% */}
                      <td className="px-2 py-2 text-center">
                        {isEditing ? (
                          <input type="number" min="0" max="100" step="0.1" value={row.disc_pct}
                            onChange={e => updateRow(idx, 'disc_pct', e.target.value)}
                            placeholder="0" className={`${tiCls} text-center w-16`} />
                        ) : (
                          <span className="text-gray-600">{row.disc_pct ? `${row.disc_pct}%` : '—'}</span>
                        )}
                      </td>

                      {/* Disc amt */}
                      <td className="px-2 py-2 text-right font-mono text-blue-700">{fmt(c.disc_amt)}</td>

                      {/* Net amt */}
                      <td className="px-2 py-2 text-right font-bold text-green-700 font-mono">{fmt(c.net_amt)}</td>

                      {/* Actions */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 justify-center">
                          {isEditing ? (
                            <button onClick={() => confirmRow(idx)} title="Confirm"
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all">
                              <Check size={13} />
                            </button>
                          ) : (
                            <button onClick={() => editRow(idx)} title="Edit"
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all">
                              <Edit3 size={13} />
                            </button>
                          )}
                          <button onClick={() => deleteRow(idx)} title="Delete"
                            className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════ RIGHT PANEL — Live Summary ══════════════════ */}
      <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0">

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-md overflow-hidden sticky top-4">
          <div className="px-5 py-3 bg-gradient-to-r from-green-700 to-green-500 flex items-center gap-2">
            <FileText size={15} className="text-green-200" />
            <h2 className="text-sm font-bold text-white">Bill Summary</h2>
          </div>

          <div className="p-5 space-y-5">

            {/* Totals */}
            <div className="space-y-2">
              {[
                { label: 'Subtotal',       value: summary.subtotal,      color: 'text-gray-800' },
                { label: 'Total Discount', value: -summary.totalDiscount, color: 'text-blue-600' },
                { label: 'Total GST',      value: summary.totalGST,      color: 'text-orange-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">{label}</span>
                  <span className={`text-sm font-bold font-mono ${color}`}>
                    {value < 0 ? `- ${fmt(Math.abs(value))}` : fmt(value)}
                  </span>
                </div>
              ))}

              {roundOff && summary.roundOff_amt !== 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500 font-medium">Round Off</span>
                  <span className="text-sm font-mono text-gray-500">
                    {summary.roundOff_amt > 0 ? '+' : ''}{fmt(summary.roundOff_amt)}
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-3 mt-1">
                <span className="text-lg font-bold text-gray-800">Grand Total</span>
                <span className="text-2xl font-bold text-green-700 font-mono">{fmt(summary.grandTotal)}</span>
              </div>

              {/* Round-off toggle */}
              <button onClick={() => setRoundOff(p => !p)}
                className={`flex items-center gap-2 text-sm font-semibold transition-colors pt-1 ${roundOff ? 'text-green-600' : 'text-gray-400'}`}>
                {roundOff ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                Round Off
              </button>
            </div>

            {/* Payment Mode */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_MODES.map(mode => (
                  <button key={mode} onClick={() => setPaymentMode(mode)}
                    className={[
                      'py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                      paymentMode === mode
                        ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-100'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                    ].join(' ')}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button onClick={handleSave} disabled={saving || !hasItems}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-md shadow-green-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={17} /> {saving ? 'Saving…' : 'Save Bill'}
              </button>

              <button onClick={handlePDF} disabled={!hasItems}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border-2 border-green-600 text-green-700 font-semibold hover:bg-green-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                <Download size={15} /> Print / Download PDF
              </button>

              <button onClick={handleClear}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 active:scale-95 transition-all text-sm">
                <XCircle size={15} /> Clear All
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
