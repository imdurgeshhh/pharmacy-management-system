import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../config/axios';
import useStore from '../store/useStore';
import {
  ShoppingCart, User, Phone, Hash, Stethoscope, FileText, Calendar,
  Plus, Trash2, Edit3, Check, X, Download, Save, XCircle,
  Search, ChevronDown, AlertCircle, CheckCircle2, ToggleLeft, ToggleRight,
  Sparkles
} from 'lucide-react';
import MedicinePicker from '../components/pos/MedicinePicker';
import ConfirmModal from '../components/common/ConfirmModal';
import { generateInvoicePDF } from '../utils/receiptPrinter';
import { getShopProfile, mapStoreResponse } from '../config/shop';

// ─── Constants ─────────────────────────────────────────────────────────────────
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Credit'];
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
const iCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 transition-[border-color,box-shadow] placeholder-gray-400';
const tiCls = 'w-full px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-[border-color,box-shadow] placeholder-gray-300';

// ─── Empty row factory ────────────────────────────────────────────────────────
const blankRow = () => ({ name: '', qty: 1, mrp: '', gst_pct: 12, disc_pct: '', editing: true });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — Unified Single-Page Billing
// ═══════════════════════════════════════════════════════════════════════════════
export default function POS() {
  const { user } = useStore();
  const [BILL_NO] = useState(billNo);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [validationAlert, setValidationAlert] = useState('');

  // ── Inventory ──────────────────────────────────────────────────────────────
  const [inventory, setInventory] = useState([]);
  const [inventoryError, setInventoryError] = useState('');
  const [shop, setShop] = useState(getShopProfile());
  useEffect(() => {
    document.title = 'Point of Sale (POS) — Pharma';

    api.get('/inventory').then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setInventory(data.map(m => ({
        id: m.id,
        inventory_id: m.inventory_id || m.id,
        label: m.name || m.medicine_name || '',
        mrp: parseFloat(m.mrp) || 0,
        stock_qty: parseFloat(m.total_stock) || 0,
        tax_percentage: parseFloat(m.tax_percentage) || 12,
      })).filter(m => m.label));
      setInventoryError('');
    }).catch((err) => {
      setInventory([]);
      setInventoryError(err.response?.data?.error || 'Failed to load inventory.');
    });

    api.get('/store').then(r => {
      setShop(mapStoreResponse(r.data || {}));
    }).catch(() => {
      setShop(getShopProfile());
    });
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
      inventory_id: med.inventory_id,
      stock_qty: med.stock_qty,
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
    if (!hasItems) {
      setValidationAlert('Please add at least one medicine with valid quantity and MRP before saving.');
      document.getElementById('pos-med-0')?.focus();
      return;
    }
    setValidationAlert('');
    setSaving(true);
    try {
      const validRows = computed.filter(r => r.name && r.qty && r.mrp);

      // Pre-flight stock validation if stock is known
      for (const r of validRows) {
        const inv = inventory.find(m => m.label.toLowerCase() === r.name.toLowerCase());
        const available = r.stock_qty ?? inv?.stock_qty;
        if (available !== undefined && parseFloat(r.qty) > available) {
          setValidationAlert(`⚠️ Insufficient stock for "${r.name}". Available: ${available}, Requested: ${r.qty}`);
          setSaving(false);
          return;
        }
      }

      const invItems = validRows.map(r => {
        const inv = inventory.find(m => m.label.toLowerCase() === r.name.toLowerCase());
        return {
          inventory_id: r.inventory_id || inv?.inventory_id || inv?.id,
          name: r.name,
          qty: parseFloat(r.qty) || 1,
          free_qty: parseFloat(r.free_qty) || 0,
          price: parseFloat(r.mrp) || 0,
          old_mrp: parseFloat(r.old_mrp) || 0,
          tax: r.tax_amt,
          discount_pct: parseFloat(r.disc_pct) || 0,
          scheme_pct: parseFloat(r.scheme_pct) || 0,
          trade_rate: parseFloat(r.trade_rate || inv?.trade_rate || inv?.purchase_price || r.mrp) || 0,
          hsn_code: r.hsn_code || inv?.hsn_code || '3004',
          pack: r.pack || inv?.pack_size || '1',
        };
      });

      await api.post('/sales', {
        customer_name: customer.name,
        customer_phone: customer.phone,
        employee_id: user?.id || 1,
        total_amount: summary.grandTotal,
        tax_amount: summary.totalGST,
        sub_total: summary.subtotal,
        discount_amount: summary.totalDiscount,
        round_off: summary.roundOffDiff || 0,
        payment_mode: paymentMode,
        invoice_no: BILL_NO,
        doctor_name: customer.doctor,
        rx_number: customer.prescription,
        items: invItems,
      });
      alert(`✅ Bill ${BILL_NO} saved successfully!`);
      handleClear();
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message;
      alert('Save failed: ' + errorMsg);
      setValidationAlert('Save failed: ' + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = () => {
    if (!hasItems) {
      setValidationAlert('Please add at least one medicine before generating the PDF invoice.');
      document.getElementById('pos-med-0')?.focus();
      return;
    }
    if (!shop?.name || !shop.name.trim()) {
      setValidationAlert('Please complete Store Details in Profile before generating invoices.');
      return;
    }
    setValidationAlert('');
    generateInvoicePDF(customer, computed.filter(r => r.name && r.qty && r.mrp), summary, paymentMode, BILL_NO, shop);
  };

  const handleClearClick = () => {
    const hasData = customer.name || customer.phone || customer.doctor || customer.prescription || hasItems;
    if (hasData) {
      setShowClearConfirm(true);
    } else {
      handleClear();
    }
  };

  const handleClear = () => {
    setCustomer({ name: '', phone: '', gst: '', doctor: '', prescription: '', bill_date: todayStr() });
    setRows([blankRow()]);
    setPaymentMode('Cash');
    setRoundOff(false);
    setGstOk(null);
    setValidationAlert('');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col xl:flex-row gap-5 animate-fade-in relative z-10 lg:pl-4 pb-10">

      {/* ══════════════════ LEFT PANEL ══════════════════ */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">

        {/* Page Title */}
        <div className="flex items-center gap-3">
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-700 to-green-500 shadow-lg shrink-0">
            <ShoppingCart size={18} className="text-white" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Customer Billing</h1>
            {/* P1: text-gray-500 -> text-gray-700 */}
            <p className="text-xs text-gray-700">Bill # <span className="font-mono font-bold text-green-800">{BILL_NO}</span></p>
            {inventoryError && <p className="text-xs text-red-700 mt-1" role="alert">{inventoryError}</p>}
          </div>
        </div>

        {/* ─── Customer Details (compact) ─── */}
        <fieldset className="bg-white rounded-2xl border border-green-100 shadow-md overflow-hidden">
          <legend className="w-full block p-0 m-0">
            <div className="px-5 py-3 bg-gradient-to-r from-green-900 to-green-800 flex items-center gap-2">
              <User size={15} className="text-green-200" aria-hidden="true" />
              <h2 className="text-sm font-bold text-white">Customer Details</h2>
            </div>
          </legend>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

            <div>
              <label htmlFor="customer-name" className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <User size={10} aria-hidden="true" />Name
              </label>
              <input id="customer-name" autoComplete="off" value={customer.name} onChange={e => setC('name', e.target.value)}
                placeholder="Walk-in…" className={iCls} />
            </div>

            <div>
              <label htmlFor="customer-phone" className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Phone size={10} aria-hidden="true" />Phone
              </label>
              <input id="customer-phone" type="tel" inputMode="tel" autoComplete="off" value={customer.phone} onChange={e => setC('phone', e.target.value)}
                placeholder="9876543210…" className={iCls} />
            </div>

            <div>
              <label htmlFor="customer-gst" className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Hash size={10} aria-hidden="true" />GST <span className="font-normal text-gray-700 normal-case text-xs">(opt)</span>
              </label>
              <div className="relative">
                <input id="customer-gst" autoComplete="off" spellCheck={false} autoCapitalize="characters" value={customer.gst} onChange={e => setC('gst', e.target.value)}
                  maxLength={15} placeholder="22AAAAA0000A1Z5…"
                  className={`${iCls} pr-7 font-mono text-xs uppercase tracking-widest ${gstOk === false ? 'border-red-400' : gstOk === true ? 'border-green-400' : ''}`} />
                {gstOk === true  && <CheckCircle2 size={13} className="absolute right-2.5 top-2.5 text-green-700" aria-label="Valid GST" />}
                {gstOk === false && <AlertCircle  size={13} className="absolute right-2.5 top-2.5 text-red-600" aria-label="Invalid GST" />}
              </div>
            </div>

            <div>
              <label htmlFor="customer-doctor" className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Stethoscope size={10} aria-hidden="true" />Doctor <span className="font-normal text-gray-700 normal-case">(opt)</span>
              </label>
              <input id="customer-doctor" autoComplete="off" value={customer.doctor} onChange={e => setC('doctor', e.target.value)}
                placeholder="Dr. Sharma…" className={iCls} />
            </div>

            <div>
              <label htmlFor="customer-prescription" className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <FileText size={10} aria-hidden="true" />Rx No. <span className="font-normal text-gray-700 normal-case">(opt)</span>
              </label>
              <input id="customer-prescription" autoComplete="off" value={customer.prescription} onChange={e => setC('prescription', e.target.value)}
                placeholder="RX-001…" className={iCls} />
            </div>

            <div>
              <label htmlFor="customer-date" className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Calendar size={10} aria-hidden="true" />Date
              </label>
              <input type="date" id="customer-date" autoComplete="off" value={customer.bill_date} onChange={e => setC('bill_date', e.target.value)}
                className={iCls} />
            </div>

          </div>
        </fieldset>

        {/* ─── Medicine Bill Table ─── */}
        <fieldset className="bg-white rounded-2xl border border-green-100 shadow-md overflow-hidden flex-1">
          <legend className="w-full block p-0 m-0">
            <div className="px-5 py-3 bg-gradient-to-r from-green-900 to-green-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-green-200" aria-hidden="true" />
                <h2 className="text-sm font-bold text-white">Medicine Bill</h2>
              </div>
              <button
                type="button"
                onClick={addRow}
                aria-label="Add medicine row"
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl bg-white text-green-900 hover:bg-green-50 text-xs font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <Plus size={13} aria-hidden="true" /> Add Row
              </button>
            </div>
          </legend>

          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Medicine items list">
            <table className="w-full text-xs" style={{ minWidth: 760 }}>
              <thead className="bg-green-50 border-b border-green-100 text-green-950 uppercase tracking-wider font-bold">
                <tr>
                  <th id="th-pos-med" scope="col" className="px-3 py-2.5 text-left font-bold w-40 text-green-950">Medicine</th>
                  <th id="th-pos-qty" scope="col" className="px-2 py-2.5 text-center font-bold w-16 text-green-950">Qty</th>
                  <th id="th-pos-mrp" scope="col" className="px-2 py-2.5 text-left font-bold w-20 text-green-950">MRP</th>
                  <th id="th-pos-gst" scope="col" className="px-2 py-2.5 text-center font-bold w-16 text-green-950">GST%</th>
                  <th id="th-pos-tax" scope="col" className="px-2 py-2.5 text-right font-bold w-20 text-green-950">Tax</th>
                  <th id="th-pos-disc" scope="col" className="px-2 py-2.5 text-center font-bold w-16 text-green-950">Disc%</th>
                  <th id="th-pos-discamt" scope="col" className="px-2 py-2.5 text-right font-bold w-20 text-green-950">Disc Amt</th>
                  <th id="th-pos-net" scope="col" className="px-2 py-2.5 text-right font-bold w-24 text-green-950">Net Amt</th>
                  <th scope="col" className="px-2 py-2.5 w-16"><span className="sr-only">Row Actions</span></th>
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
                          <div>
                            <label htmlFor={`pos-med-${idx}`} className="sr-only">
                              Medicine name row {idx + 1}
                            </label>
                            <MedicinePicker
                              id={`pos-med-${idx}`}
                              ariaLabelledBy="th-pos-med"
                              ariaLabel={`Medicine name for row ${idx + 1}`}
                              value={row.name}
                              onChange={v => updateRow(idx, 'name', v)}
                              inventory={inventory}
                              onSelect={m => pickMedicine(idx, m)}
                              className={tiCls}
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-800 truncate block max-w-[150px]" title={row.name}>{row.name}</span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="px-2 py-2 text-center">
                        {isEditing ? (
                          <div>
                            <label htmlFor={`pos-qty-${idx}`} className="sr-only">
                              Quantity row {idx + 1}
                            </label>
                            <input
                              id={`pos-qty-${idx}`}
                              type="number"
                              min="1"
                              value={row.qty}
                              aria-labelledby="th-pos-qty"
                              aria-label={`Quantity for row ${idx + 1}`}
                              onChange={e => updateRow(idx, 'qty', e.target.value)}
                              className={`${tiCls} text-center font-bold w-16`}
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-gray-800">{row.qty}</span>
                        )}
                      </td>

                      {/* MRP */}
                      <td className="px-2 py-2">
                        {isEditing ? (
                          <div>
                            <label htmlFor={`pos-mrp-${idx}`} className="sr-only">
                              MRP row {idx + 1}
                            </label>
                            <input
                              id={`pos-mrp-${idx}`}
                              type="number"
                              step="0.01"
                              value={row.mrp}
                              aria-labelledby="th-pos-mrp"
                              aria-label={`Maximum Retail Price for row ${idx + 1}`}
                              onChange={e => updateRow(idx, 'mrp', e.target.value)}
                              placeholder="0.00"
                              className={`${tiCls} w-20 tabular-nums`}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-700 font-mono tabular-nums">{fmt(row.mrp)}</span>
                        )}
                      </td>

                      {/* GST% */}
                      <td className="px-2 py-2 text-center">
                        {isEditing ? (
                          <div>
                            <label htmlFor={`pos-gst-${idx}`} className="sr-only">
                              GST percentage row {idx + 1}
                            </label>
                            <select
                              id={`pos-gst-${idx}`}
                              value={row.gst_pct}
                              aria-labelledby="th-pos-gst"
                              aria-label={`GST percentage for row ${idx + 1}`}
                              onChange={e => updateRow(idx, 'gst_pct', e.target.value)}
                              className={`${tiCls} cursor-pointer w-16 tabular-nums`}
                            >
                              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </div>
                        ) : (
                          <span className="bg-orange-100 text-orange-900 border border-orange-200 rounded-md px-1.5 py-0.5 font-semibold tabular-nums">{row.gst_pct}%</span>
                        )}
                      </td>

                      {/* Tax amt — always computed */}
                      <td className="px-2 py-2 text-right font-mono text-orange-950 font-semibold tabular-nums">{fmt(c.tax_amt)}</td>

                      {/* Disc% */}
                      <td className="px-2 py-2 text-center">
                        {isEditing ? (
                          <div>
                            <label htmlFor={`pos-disc-${idx}`} className="sr-only">
                              Discount percentage row {idx + 1}
                            </label>
                            <input
                              id={`pos-disc-${idx}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={row.disc_pct}
                              aria-labelledby="th-pos-disc"
                              aria-label={`Discount percentage for row ${idx + 1}`}
                              onChange={e => updateRow(idx, 'disc_pct', e.target.value)}
                              placeholder="0"
                              className={`${tiCls} text-center w-16 tabular-nums`}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-700 tabular-nums">{row.disc_pct ? `${row.disc_pct}%` : '—'}</span>
                        )}
                      </td>

                      {/* Disc amt */}
                      <td className="px-2 py-2 text-right font-mono text-blue-900 font-semibold tabular-nums">{fmt(c.disc_amt)}</td>

                      {/* Net amt */}
                      <td className="px-2 py-2 text-right font-bold text-green-900 font-mono tabular-nums">{fmt(c.net_amt)}</td>

                      {/* Actions */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 justify-center">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => confirmRow(idx)}
                              aria-label={`Confirm row ${idx + 1}`}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-green-50 text-green-800 hover:bg-green-100 transition-[background-color,color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700">
                              <Check size={13} aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => editRow(idx)}
                              aria-label={`Edit row ${idx + 1} (${row.name || 'empty'})`}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 transition-[background-color,color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                              <Edit3 size={13} aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteRow(idx)}
                            aria-label={`Delete row ${idx + 1} (${row.name || 'empty'})`}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-[background-color,color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </fieldset>
      </div>

      {/* ══════════════════ RIGHT PANEL — Live Summary ══════════════════ */}
      <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0">

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-md overflow-hidden sticky top-4">
          <div className="px-5 py-3 bg-gradient-to-r from-green-900 to-green-800 flex items-center gap-2">
            <FileText size={15} className="text-green-200" aria-hidden="true" />
            <h2 className="text-sm font-bold text-white text-balance">Bill Summary</h2>
          </div>

          <div className="p-5 space-y-5">

            {/* Totals */}
            <div className="space-y-2">
              {[
                { label: 'Subtotal',       value: summary.subtotal,      color: 'text-gray-800' },
                { label: 'Total Discount', value: -summary.totalDiscount, color: 'text-blue-900' },
                { label: 'Total GST',      value: summary.totalGST,      color: 'text-orange-950' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-sm text-gray-700 font-medium">{label}</span>
                  <span className={`text-sm font-bold font-mono tabular-nums ${color}`}>
                    {value < 0 ? `- ${fmt(Math.abs(value))}` : fmt(value)}
                  </span>
                </div>
              ))}

              {roundOff && summary.roundOff_amt !== 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-sm text-gray-700 font-medium">Round Off</span>
                  <span className="text-sm font-mono text-gray-700 tabular-nums">
                    {summary.roundOff_amt > 0 ? '+' : ''}{fmt(summary.roundOff_amt)}
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-3 mt-1">
                <span className="text-lg font-bold text-gray-800">Grand Total</span>
                <span className="text-2xl font-bold text-green-900 font-mono tabular-nums">{fmt(summary.grandTotal)}</span>
              </div>

              {/* Round-off toggle */}
              <button
                type="button"
                onClick={() => setRoundOff(p => !p)}
                aria-label="Toggle Round Off"
                className={`flex items-center gap-2 text-sm font-semibold transition-colors pt-1 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 rounded ${roundOff ? 'text-green-700' : 'text-gray-600'}`}>
                {roundOff ? <ToggleRight size={20} aria-hidden="true" /> : <ToggleLeft size={20} aria-hidden="true" />}
                Round Off
              </button>
            </div>

            {/* Payment Mode */}
            <fieldset className="border-0 p-0 m-0">
              <legend className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">Payment Mode</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment Mode">
                {PAYMENT_MODES.map(mode => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={paymentMode === mode}
                    onClick={() => setPaymentMode(mode)}
                    aria-label={`Payment mode ${mode}`}
                    className={[
                      'py-2 rounded-xl text-sm font-semibold border-2 transition-[background-color,border-color,transform] duration-200 min-h-[44px] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700',
                      paymentMode === mode
                        ? 'bg-green-700 text-white border-green-700 shadow-md shadow-green-100'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                    ].join(' ')}>
                    {mode}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Validation Alerts for Keyboard and Screen Readers */}
            {validationAlert && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-1.5" role="alert">
                <AlertCircle size={15} className="shrink-0 text-red-600" aria-hidden="true" />
                <span>{validationAlert}</span>
              </p>
            )}

            {!hasItems && !validationAlert && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-1.5" role="note">
                <AlertCircle size={14} className="shrink-0 text-amber-600" aria-hidden="true" />
                <span>Add at least one medicine item to enable bill saving and PDF printing.</span>
              </p>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                aria-disabled={saving || !hasItems}
                aria-label="Save Bill"
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-md transition-[background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-1 min-h-[44px] ${
                  saving || !hasItems
                    ? 'bg-green-800/60 text-white/90 cursor-not-allowed opacity-80'
                    : 'bg-green-700 text-white hover:bg-green-800 shadow-green-200 active:scale-[0.96]'
                }`}>
                <Save size={17} aria-hidden="true" /> {saving ? 'Saving…' : 'Save Bill'}
              </button>

              <button
                type="button"
                onClick={handlePDF}
                aria-disabled={!hasItems}
                aria-label="Print / Download PDF"
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold transition-[background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-1 text-sm min-h-[44px] ${
                  !hasItems
                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-green-700 text-green-900 hover:bg-green-50 active:scale-[0.96]'
                }`}>
                <Download size={15} aria-hidden="true" /> Print / Download PDF
              </button>

              <button
                type="button"
                onClick={handleClearClick}
                aria-label="Clear all bill fields"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.96] transition-[background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 text-sm min-h-[44px]">
                <XCircle size={15} aria-hidden="true" /> Clear All
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          handleClear();
          setShowClearConfirm(false);
        }}
        title="Clear Entire Bill?"
        message="Are you sure you want to clear all entered customer details and medicine rows? Any unsaved changes will be lost."
        confirmText="Clear All"
        confirmVariant="danger"
      />

    </div>
  );
}
