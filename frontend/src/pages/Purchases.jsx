import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../config/axios';
import {
  PackagePlus, Save, Plus, Trash2, Edit3, Check, X,
  Building2, Hash, Calendar, ChevronDown, Search, ClipboardList, CheckCircle2
} from 'lucide-react';
import PurchaseItemsTable from '../components/purchases/PurchaseItemsTable';
import { SCHEDULE_CONFIG, SCHEDULE_OPTIONS } from '../utils/scheduleConfig';

// ─── Constants ─────────────────────────────────────────────────────────────────
const GST_RATES = [0, 5, 12, 18, 28];
const todayStr = () => new Date().toISOString().slice(0, 10);
const rupee = (n) => `₹${(Number(n) || 0).toFixed(2)}`;

const CATEGORY_OPTIONS = [
  'General', 'Antibiotic', 'Painkiller', 'Supplement',
  'Cough & Cold', 'Allergy', 'Gastrointestinal', 'Other'
];

const FORM_OPTIONS = [
  'Tablet', 'Capsule', 'Syrup', 'Injection',
  'Cream', 'Gel', 'Drops', 'Other'
];

// ─── Auto-compute tax/discount/final for one row ──────────────────────────────
const compute = (r) => {
  const price = parseFloat(r.price) || 0;
  const gst   = parseFloat(r.gst_pct) || 0;
  const disc  = parseFloat(r.disc_pct) || 0;
  const tax_amt  = +(price * gst  / 100).toFixed(2);
  const disc_amt = +(price * disc / 100).toFixed(2);
  const final    = +(price - disc_amt + tax_amt).toFixed(2);
  return { ...r, tax_amt, disc_amt, final };
};

// ─── Input styles ─────────────────────────────────────────────────────────────
const iCls = [
  'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500',
  'transition-[border-color,box-shadow] placeholder-gray-400'
].join(' ');

const roiCls = [
  'w-full px-3 py-2 text-sm rounded-xl border border-gray-100',
  'bg-amber-50 text-amber-700 font-mono text-right cursor-not-allowed select-none tabular-nums'
].join(' ');

// ─── Small Label ──────────────────────────────────────────────────────────────
const L = ({ t, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">{t}</label>
);

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

// ─── Supplier dropdown ────────────────────────────────────────────────────────
function SupplierSelect({ suppliers, value, onSelect, btnId }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useClickOutside(() => setOpen(false));

  const filtered = suppliers.filter(s =>
    !q || (s.name || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  const selected = suppliers.find(s => s.id === value);

  useEffect(() => {
    if (!open) return;
    setActiveIdx(-1);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        document.getElementById(btnId)?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(prev => (prev + 1 < filtered.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(prev => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0 && filtered[activeIdx]) {
          e.preventDefault();
          onSelect(filtered[activeIdx]);
          setOpen(false);
          setQ('');
          document.getElementById(btnId)?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, activeIdx, btnId, onSelect]);

  return (
    <div className="relative" ref={ref}>
      <button id={btnId} type="button" onClick={() => setOpen(v => !v)}
        aria-label="Choose supplier"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${iCls} flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2`}>
        <span className={selected ? 'text-gray-900 font-semibold' : 'text-gray-700 font-normal'}>
          {selected ? selected.name : 'Choose supplier…'}
        </span>
        <ChevronDown size={14} className="text-gray-600 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden" role="listbox">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2 text-gray-500" aria-hidden="true" />
              <input autoFocus value={q} onChange={e => { setQ(e.target.value); setActiveIdx(-1); }}
                autoComplete="off" spellCheck={false}
                placeholder="Search supplier…"
                aria-label="Search supplier"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 text-gray-800" />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-center text-xs text-gray-500 py-3">No suppliers found</p>
              : filtered.map((s, idx) => (
                  <button key={s.id} type="button" role="option"
                    aria-selected={s.id === value}
                    onMouseDown={() => { onSelect(s); setOpen(false); setQ(''); }}
                    onClick={() => { onSelect(s); setOpen(false); setQ(''); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0 focus-visible:outline-none focus-visible:bg-green-100 ${
                      idx === activeIdx ? 'bg-green-100/80 ring-1 ring-inset ring-green-500' : ''
                    } ${s.id === value ? 'font-bold text-green-800' : 'text-gray-800'}`}>
                    {s.name}
                    {s.phone ? <span className="block text-xs text-gray-600 font-normal tabular-nums">{s.phone}</span> : null}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Medicine autocomplete input ──────────────────────────────────────────────
function MedicinePicker({ value, onChange, medicines, onSelect, inputId }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useClickOutside(() => setOpen(false));

  const hits = value.trim().length > 0
    ? medicines.filter(m => m.label.toLowerCase().includes(value.toLowerCase())).slice(0, 7)
    : [];

  const handleKeyDown = (e) => {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => (prev + 1 < hits.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => (prev - 1 >= 0 ? prev - 1 : hits.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && hits[activeIdx]) {
        e.preventDefault();
        onSelect(hits[activeIdx]);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <input
        id={inputId}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => { setOpen(true); setActiveIdx(-1); }}
        onKeyDown={handleKeyDown}
        placeholder="Type medicine name…"
        aria-label="Medicine name"
        aria-autocomplete="list"
        aria-expanded={open && hits.length > 0}
        role="combobox"
        className={iCls}
      />
      {open && hits.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto" role="listbox">
          {hits.map((m, i) => (
            <button key={i} type="button" role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => { onSelect(m); setOpen(false); }}
              onClick={() => { onSelect(m); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0 text-gray-800 font-medium flex items-center justify-between ${
                i === activeIdx ? 'bg-green-100/80 ring-1 ring-inset ring-green-500' : ''
              }`}>
              <div>
                <span>{m.label}</span>
                {m.mrp ? <span className="ml-2 text-xs text-green-800 font-bold">{rupee(m.mrp)}</span> : null}
              </div>
              <span className="text-[10px] uppercase font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                {m.schedule || 'OTC'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Green section card ───────────────────────────────────────────────────────
const Section = ({ icon, title, right, children }) => (
  <div className="rounded-2xl bg-white border border-green-100 shadow-md overflow-hidden">
    <div className="px-6 py-3.5 bg-gradient-to-r from-green-800 to-green-700 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-green-100">{icon}</span>
        <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
      </div>
      {right}
    </div>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Purchases() {

  // ── Remote data ────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const loadMedicines = () => {
    // Inventory endpoint returns medicine data joined with stock and schedule
    api.get('/inventory')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setMedicines(data.map(m => ({
          id: m.id,
          // Live DB uses `name`; inventoryController join may alias it differently
          label: m.name || m.medicine_name || m.label || '',
          mrp: parseFloat(m.mrp) || 0,
          purchase_price: parseFloat(m.purchase_price) || 0,
          schedule: (m.schedule || 'NONE').toUpperCase(),
          brand_name: m.brand_name || '',
          salt_composition: m.salt_composition || '',
          category: m.medicine_category || m.category || 'General',
          dosage_form: m.dosage_form || 'Tablet',
          strength: m.strength || '',
        })).filter(m => m.label));
      })
      .catch(() => setMedicines([]));
  };

  useEffect(() => {
    document.title = 'Purchases & Stock In — Pharma';
    api.get('/suppliers')
      .then(r => setSuppliers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSuppliers([]));

    loadMedicines();
  }, []);

  // ── Supplier section ───────────────────────────────────────────────────────
  const [supplierId, setSupplierId] = useState(null);
  const [suppGst, setSuppGst]       = useState('');
  const [invoiceNo, setInvoiceNo]   = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [suppConfirmed, setSuppConfirmed] = useState(false);

  const handlePickSupplier = (s) => {
    setSupplierId(s.id);
    setSuppGst(s.gst_number || '');
    setSuppConfirmed(false);
  };

  // ── Medicine add form ──────────────────────────────────────────────────────
  const blank = () => ({
    medicine_name: '', medicine_id: null,
    brand_name: '', salt_composition: '',
    category: 'General', dosage_form: 'Tablet', strength: '',
    batch_number: '', expiry_date: '',
    qty: '', price: '',
    gst_pct: 12, disc_pct: '',
    schedule: '',
    is_new: true,
  });

  const [form, setForm]     = useState(blank());
  const [editIdx, setEditIdx] = useState(null);
  const [formValidationMsg, setFormValidationMsg] = useState('');

  const sf = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setFormValidationMsg('');
  };

  const pickMed = (m) => {
    setForm(p => ({
      ...p,
      medicine_name: m.label,
      medicine_id: m.id,
      schedule: m.schedule || 'NONE',
      brand_name: m.brand_name || '',
      salt_composition: m.salt_composition || '',
      category: m.category || 'General',
      dosage_form: m.dosage_form || 'Tablet',
      strength: m.strength || '',
      is_new: false,
      price: m.purchase_price ? String(m.purchase_price) : (m.mrp ? String(m.mrp) : p.price)
    }));
    setFormValidationMsg('');
  };

  const handleMedNameChange = (val) => {
    setFormValidationMsg('');
    const match = medicines.find(m => m.label.trim().toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setForm(p => ({
        ...p,
        medicine_name: val,
        medicine_id: match.id,
        schedule: match.schedule || 'NONE',
        brand_name: match.brand_name || '',
        salt_composition: match.salt_composition || '',
        category: match.category || 'General',
        dosage_form: match.dosage_form || 'Tablet',
        strength: match.strength || '',
        is_new: false,
        price: p.price || (match.purchase_price ? String(match.purchase_price) : (match.mrp ? String(match.mrp) : p.price))
      }));
    } else {
      setForm(p => ({
        ...p,
        medicine_name: val,
        medicine_id: null,
        schedule: p.medicine_id ? '' : p.schedule,
        brand_name: p.medicine_id ? '' : p.brand_name,
        salt_composition: p.medicine_id ? '' : p.salt_composition,
        category: p.medicine_id ? 'General' : p.category,
        dosage_form: p.medicine_id ? 'Tablet' : p.dosage_form,
        strength: p.medicine_id ? '' : p.strength,
        is_new: true
      }));
    }
  };

  const cForm = compute(form);
  const canAdd = Boolean(
    form.medicine_name.trim() &&
    form.batch_number.trim() &&
    form.qty &&
    form.price &&
    (!form.is_new || form.schedule)
  );

  // ── Entries list ───────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);

  const addOrUpdate = () => {
    if (!form.medicine_name.trim()) {
      setFormValidationMsg('Please enter or select a medicine name.');
      document.getElementById('med-name')?.focus();
      return;
    }
    if (form.is_new && !form.schedule) {
      setFormValidationMsg('Please select a drug schedule for this new medicine.');
      document.getElementById('med-schedule')?.focus();
      return;
    }
    if (!form.batch_number.trim()) {
      setFormValidationMsg('Please enter a batch number.');
      document.getElementById('med-batch')?.focus();
      return;
    }
    if (!form.qty || parseFloat(form.qty) <= 0) {
      setFormValidationMsg('Please enter a valid quantity greater than zero.');
      document.getElementById('med-qty')?.focus();
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      setFormValidationMsg('Please enter a valid purchase price.');
      document.getElementById('med-price')?.focus();
      return;
    }

    setFormValidationMsg('');
    const row = {
      ...compute(form),
      schedule: form.schedule || 'NONE',
      is_new: form.is_new
    };
    if (editIdx !== null) {
      setEntries(p => p.map((e, i) => i === editIdx ? row : e));
      setEditIdx(null);
    } else {
      setEntries(p => [...p, row]);
    }
    setForm(blank());
  };

  const startEdit = (idx) => {
    setForm({ ...entries[idx] });
    setEditIdx(idx);
    setFormValidationMsg('');
  };

  const deleteRow = (idx) => {
    setEntries(p => p.filter((_, i) => i !== idx));
    if (editIdx === idx) {
      setForm(blank());
      setEditIdx(null);
      setFormValidationMsg('');
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (entries.length === 0) return alert('Add at least one medicine first.');

    setSaving(true);
    try {
      const totalTax = entries.reduce((s, e) => s + e.tax_amt * (parseFloat(e.qty) || 0), 0);
      const totalAmt = entries.reduce((s, e) => s + e.final * (parseFloat(e.qty) || 0), 0);

      await api.post('/purchases', {
        supplier_id: supplierId,
        total_amount: +totalAmt.toFixed(2),
        tax_amount:   +totalTax.toFixed(2),
        items: entries.map(e => ({
          medicine_id:      e.medicine_id ? parseInt(e.medicine_id) : null,
          medicine_name:    e.medicine_name,
          schedule:         e.schedule || 'NONE',
          brand_name:       e.brand_name || null,
          salt_composition: e.salt_composition || null,
          category:         e.category || 'General',
          dosage_form:      e.dosage_form || null,
          strength:         e.strength || null,
          batch_number:     e.batch_number,
          qty:              parseFloat(e.qty),
          price:            parseFloat(e.final),
          tax:              e.tax_amt,
          mrp:              parseFloat(e.price),
          expiry_date:      e.expiry_date || null,
          tax_percentage:   parseFloat(e.gst_pct) || 0,
        })),
      });

      alert(`✅ ${entries.length} medicine(s) saved to stock!`);
      setEntries([]); setForm(blank()); setEditIdx(null);
      setSupplierId(null); setSuppGst(''); setInvoiceNo('');
      setInvoiceDate(todayStr()); setSuppConfirmed(false);
      loadMedicines(); // Refresh medicines list with any newly added medicine
    } catch (err) {
      alert('Save failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in relative z-10 lg:pl-4 pb-10">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-800 to-green-600 shadow-lg shrink-0">
          <PackagePlus size={20} className="text-white" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stock In Entry</h1>
          <p className="text-sm text-gray-700 mt-0.5">Record medicines received from suppliers. Stock updates automatically.</p>
        </div>
      </div>

      {/* ── Unified Stock Entry Form ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-green-100 shadow-md overflow-hidden">

        {/* Shared header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-green-800 to-green-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-green-100"><PackagePlus size={17} aria-hidden="true" /></span>
            <h2 className="text-sm font-bold text-white tracking-wide">Stock Entry Form</h2>
          </div>
          {editIdx !== null && (
            <button
              type="button"
              onClick={() => { setForm(blank()); setEditIdx(null); setFormValidationMsg(''); }}
              className="flex items-center gap-1 text-xs text-white/90 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
              <X size={13} aria-hidden="true" /> Cancel Edit
            </button>
          )}
        </div>

        {/* ── Step 1: Supplier Details ── */}
        <div className="p-6 pb-4">
          <fieldset className="border border-green-200/80 rounded-2xl p-4 sm:p-5 bg-green-50/20 space-y-4">
            <legend className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-950 bg-white rounded-xl border border-green-200 shadow-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-800 text-white text-[10px] font-bold shrink-0">1</span>
              <Building2 size={15} className="text-green-800" aria-hidden="true" />
              <span>Supplier &amp; Invoice Details</span>
              {suppConfirmed && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-900 border border-green-300 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle2 size={10} aria-hidden="true" /> Confirmed
                </span>
              )}
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div>
                <L t="Supplier Name *" htmlFor="supp-select-btn" />
                <SupplierSelect suppliers={suppliers} value={supplierId} onSelect={handlePickSupplier} btnId="supp-select-btn" />
              </div>

              <div>
                <L t="GST Number" htmlFor="supp-gst" />
                <input id="supp-gst" value={suppGst} onChange={e => setSuppGst(e.target.value.toUpperCase())}
                  placeholder="Auto-filled / editable" maxLength={15}
                  aria-label="Supplier GST number"
                  className={`${iCls} font-mono uppercase tracking-widest`} />
              </div>

              <div>
                <L t="Invoice Number" htmlFor="supp-invoice-no" />
                <div className="relative">
                  <Hash size={13} className="absolute left-3 top-2.5 text-gray-500" aria-hidden="true" />
                  <input id="supp-invoice-no" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                    placeholder="INV-2024-001" aria-label="Invoice number" className={`${iCls} pl-8`} />
                </div>
              </div>

              <div>
                <L t="Invoice Date" htmlFor="supp-invoice-date" />
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-2.5 text-gray-500" aria-hidden="true" />
                  <input id="supp-invoice-date" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                    aria-label="Invoice date" className={`${iCls} pl-8`} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!supplierId) { alert('Please select a supplier first'); return; }
                  setSuppConfirmed(true);
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold shadow-sm active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2">
                <Check size={15} aria-hidden="true" /> Confirm Supplier
              </button>
            </div>
          </fieldset>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-dashed border-green-100" />

        {/* ── Step 2: Add Medicine Entry ── */}
        <div className="p-6 pt-2 pb-5 space-y-4">
          <fieldset className="border border-green-200/80 rounded-2xl p-4 sm:p-5 bg-green-50/20 space-y-4">
            <legend className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-950 bg-white rounded-xl border border-green-200 shadow-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-800 text-white text-[10px] font-bold shrink-0" aria-hidden="true">2</span>
              <Plus size={15} className="text-green-800" aria-hidden="true" />
              <span>{editIdx !== null ? `Editing Entry #${editIdx + 1}` : 'Medicine Item Entry'}</span>
            </legend>

            {/* Row 1: name, schedule, batch, expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div>
                <L t="Medicine Name *" htmlFor="med-name" />
                <MedicinePicker
                  inputId="med-name"
                  value={form.medicine_name}
                  onChange={handleMedNameChange}
                  medicines={medicines}
                  onSelect={pickMed}
                />
                {!form.is_new && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Catalog:</span>
                    {(() => {
                      const conf = SCHEDULE_CONFIG[form.schedule] || SCHEDULE_CONFIG.NONE;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${conf.badgeClass}`} title={conf.description}>
                          <span className={`w-1.5 h-1.5 rounded-full ${conf.dotClass}`} aria-hidden="true" />
                          {conf.label}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <L t="Drug Schedule *" htmlFor="med-schedule" />
                {!form.is_new ? (
                  <div className={`${iCls} bg-gray-50 text-gray-700 flex items-center justify-between cursor-not-allowed select-none`}>
                    <span className="font-medium">{(SCHEDULE_CONFIG[form.schedule] || SCHEDULE_CONFIG.NONE).label}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-600 bg-gray-200/80 px-1.5 py-0.5 rounded">Catalog</span>
                  </div>
                ) : (
                  <select
                    id="med-schedule"
                    value={form.schedule}
                    onChange={e => sf('schedule', e.target.value)}
                    className={`${iCls} cursor-pointer font-medium ${!form.schedule ? 'border-amber-300 bg-amber-50/20' : ''}`}
                    aria-label="Drug Schedule"
                    required
                  >
                    <option value="">Select Schedule *</option>
                    {SCHEDULE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
                {form.is_new && form.medicine_name.trim() && !form.schedule && (
                  <p className="text-[11px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                    <span>* Required for new medicine</span>
                  </p>
                )}
              </div>

              <div>
                <L t="Batch Number *" htmlFor="med-batch" />
                <input id="med-batch" value={form.batch_number} onChange={e => sf('batch_number', e.target.value)}
                  placeholder="e.g. B-2024-001" aria-label="Batch number" className={`${iCls} font-mono uppercase`} />
              </div>

              <div>
                <L t="Expiry Date" htmlFor="med-expiry" />
                <input id="med-expiry" type="date" value={form.expiry_date} onChange={e => sf('expiry_date', e.target.value)}
                  aria-label="Expiry date" className={iCls} />
              </div>
            </div>

            {/* Row 2: Medicine Attributes (Brand, Salt Composition, Category, Form, Strength) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <div>
                <L t="Brand" htmlFor="med-brand" />
                <input
                  id="med-brand"
                  value={form.brand_name}
                  onChange={e => sf('brand_name', e.target.value)}
                  placeholder="e.g. Cipla, Crocin…"
                  aria-label="Brand"
                  className={iCls}
                />
              </div>

              <div>
                <L t="Salt Composition" htmlFor="med-salt" />
                <input
                  id="med-salt"
                  value={form.salt_composition}
                  onChange={e => sf('salt_composition', e.target.value)}
                  placeholder="e.g. Paracetamol 500mg…"
                  aria-label="Salt composition"
                  className={iCls}
                />
              </div>

              <div>
                <L t="Category" htmlFor="med-category" />
                <select
                  id="med-category"
                  value={form.category}
                  onChange={e => sf('category', e.target.value)}
                  aria-label="Category"
                  className={`${iCls} cursor-pointer`}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <L t="Form" htmlFor="med-form" />
                <select
                  id="med-form"
                  value={form.dosage_form}
                  onChange={e => sf('dosage_form', e.target.value)}
                  aria-label="Dosage Form"
                  className={`${iCls} cursor-pointer`}
                >
                  {FORM_OPTIONS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <L t="Strength" htmlFor="med-strength" />
                <input
                  id="med-strength"
                  value={form.strength}
                  onChange={e => sf('strength', e.target.value)}
                  placeholder="e.g. 500mg, 10ml…"
                  aria-label="Strength"
                  className={iCls}
                />
              </div>
            </div>

            {/* Row 3: qty, price, gst%, tax, disc%, disc */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <L t="Qty *" htmlFor="med-qty" />
                <input id="med-qty" type="number" min="1" value={form.qty} onChange={e => sf('qty', e.target.value)}
                  placeholder="0" aria-label="Quantity" className={`${iCls} text-center font-bold`} />
              </div>
              <div>
                <L t="Purchase Price *" htmlFor="med-price" />
                <input id="med-price" type="number" step="0.01" min="0" value={form.price} onChange={e => sf('price', e.target.value)}
                  placeholder="0.00" aria-label="Purchase price" className={iCls} />
              </div>
              <div>
                <L t="GST %" htmlFor="med-gst" />
                <select id="med-gst" value={form.gst_pct} onChange={e => sf('gst_pct', e.target.value)}
                  aria-label="GST percentage"
                  className={`${iCls} cursor-pointer`}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div>
                <L t="Tax Amount" htmlFor="med-tax" />
                <input id="med-tax" readOnly value={rupee(cForm.tax_amt)} aria-label="Calculated tax amount" aria-readonly="true" className={roiCls} />
              </div>
              <div>
                <L t="Disc %" htmlFor="med-disc" />
                <input id="med-disc" type="number" min="0" max="100" step="0.1" value={form.disc_pct}
                  onChange={e => sf('disc_pct', e.target.value)}
                  placeholder="0" aria-label="Discount percentage" className={`${iCls} text-center`} />
              </div>
              <div>
                <L t="Disc Amount" htmlFor="med-disc-amt" />
                <input id="med-disc-amt" readOnly value={rupee(cForm.disc_amt)} aria-label="Calculated discount amount" aria-readonly="true" className={roiCls} />
              </div>
            </div>

            {/* Validation Message if any */}
            {formValidationMsg && (
              <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl font-medium flex items-center gap-1.5">
                <span>⚠️ {formValidationMsg}</span>
              </div>
            )}

            {/* Final price + Add button */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Final Price:</span>
                <span className="text-2xl font-bold text-green-800">{rupee(cForm.final)}</span>
                {form.qty > 0 && (
                  <span className="text-xs text-gray-700 font-medium">
                    × {form.qty} = {rupee(cForm.final * (parseFloat(form.qty) || 0))}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={addOrUpdate}
                disabled={!canAdd}
                aria-disabled={!canAdd}
                className={[
                  'ml-auto flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl font-semibold text-sm transition-[background-color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2',
                  canAdd
                    ? 'bg-green-700 text-white hover:bg-green-800 shadow-md shadow-green-200'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                ].join(' ')}>
                <Plus size={16} aria-hidden="true" />
                {editIdx !== null ? 'Update Entry' : 'Add to List'}
              </button>
            </div>
          </fieldset>
        </div>

      </div>

      {/* ── 3. Stock Entry List ───────────────────────────────────────────── */}
      <PurchaseItemsTable
        entries={entries}
        editIdx={editIdx}
        onStartEdit={startEdit}
        onDeleteRow={deleteRow}
        onClearAll={() => {
          setEntries([]);
          setForm(blank());
          setEditIdx(null);
          setFormValidationMsg('');
        }}
        onSave={handleSave}
        saving={saving}
        rupee={rupee}
      />

    </div>
  );
}
