import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../config/axios';
import {
  PackagePlus, Save, Plus, Trash2, Edit3, Check, X,
  Building2, Hash, Calendar, ChevronDown, Search, ClipboardList, CheckCircle2
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────
const GST_RATES = [0, 5, 12, 18, 28];
const todayStr = () => new Date().toISOString().slice(0, 10);
const rupee = (n) => `₹${(Number(n) || 0).toFixed(2)}`;

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
  'focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400',
  'transition-all placeholder-gray-400'
].join(' ');

const roiCls = [
  'w-full px-3 py-2 text-sm rounded-xl border border-gray-100',
  'bg-amber-50 text-amber-700 font-mono text-right cursor-not-allowed select-none'
].join(' ');

// ─── Small Label ──────────────────────────────────────────────────────────────
const L = ({ t }) => <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t}</label>;

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
function SupplierSelect({ suppliers, value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useClickOutside(() => setOpen(false));

  const filtered = suppliers.filter(s =>
    !q || (s.name || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  const selected = suppliers.find(s => s.id === value);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`${iCls} flex items-center justify-between cursor-pointer`}>
        <span className={selected ? 'text-gray-800 font-medium' : 'text-gray-400'}>
          {selected ? selected.name : 'Choose supplier…'}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2 text-gray-400" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-green-400" />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-center text-xs text-gray-400 py-3">No suppliers found</p>
              : filtered.map(s => (
                  <button key={s.id} type="button"
                    onMouseDown={() => { onSelect(s); setOpen(false); setQ(''); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0 ${s.id === value ? 'font-bold text-green-700' : 'text-gray-700'}`}>
                    {s.name}
                    {s.phone ? <span className="block text-xs text-gray-400 font-normal">{s.phone}</span> : null}
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
function MedicinePicker({ value, onChange, medicines, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const hits = value.trim().length > 0
    ? medicines.filter(m => m.label.toLowerCase().includes(value.toLowerCase())).slice(0, 7)
    : [];

  return (
    <div className="relative" ref={ref}>
      <input value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type medicine name…"
        className={iCls} />
      {open && hits.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
          {hits.map((m, i) => (
            <button key={i} type="button"
              onMouseDown={() => { onSelect(m); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0 text-gray-800 font-medium">
              {m.label}
              {m.mrp ? <span className="ml-2 text-xs text-green-600 font-bold">{rupee(m.mrp)}</span> : null}
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
    <div className="px-6 py-3.5 bg-gradient-to-r from-green-700 to-green-500 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-green-200">{icon}</span>
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

  useEffect(() => {
    api.get('/suppliers')
      .then(r => setSuppliers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSuppliers([]));

    // Inventory endpoint returns medicine data joined with stock
    api.get('/inventory')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setMedicines(data.map(m => ({
          id: m.id,
          // Live DB uses `name`; inventoryController join may alias it differently
          label: m.name || m.medicine_name || m.label || '',
          mrp: parseFloat(m.mrp) || 0,
        })).filter(m => m.label));
      })
      .catch(() => setMedicines([]));
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
    batch_number: '', expiry_date: '',
    qty: '', price: '',
    gst_pct: 12, disc_pct: '',
  });

  const [form, setForm]     = useState(blank());
  const [editIdx, setEditIdx] = useState(null);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pickMed = (m) => {
    sf('medicine_name', m.label);
    sf('medicine_id', m.id);
    if (m.mrp) sf('price', String(m.mrp));
  };

  const cForm = compute(form);
  const canAdd = form.medicine_name.trim() && form.batch_number.trim() && form.qty && form.price;

  // ── Entries list ───────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);

  const addOrUpdate = () => {
    if (!canAdd) return;
    const row = compute(form);
    if (editIdx !== null) {
      setEntries(p => p.map((e, i) => i === editIdx ? row : e));
      setEditIdx(null);
    } else {
      setEntries(p => [...p, row]);
    }
    setForm(blank());
  };

  const startEdit = (idx) => { setForm({ ...entries[idx] }); setEditIdx(idx); };
  const deleteRow = (idx) => {
    if (!window.confirm('Remove this entry?')) return;
    setEntries(p => p.filter((_, i) => i !== idx));
    if (editIdx === idx) { setForm(blank()); setEditIdx(null); }
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
          medicine_id:    e.medicine_id ? parseInt(e.medicine_id) : null,
          medicine_name:  e.medicine_name,
          batch_number:   e.batch_number,
          qty:            parseFloat(e.qty),
          price:          parseFloat(e.final),
          tax:            e.tax_amt,
          mrp:            parseFloat(e.price),
          expiry_date:    e.expiry_date || null,
          tax_percentage: parseFloat(e.gst_pct) || 0,
        })),
      });

      alert(`✅ ${entries.length} medicine(s) saved to stock!`);
      setEntries([]); setForm(blank()); setEditIdx(null);
      setSupplierId(null); setSuppGst(''); setInvoiceNo('');
      setInvoiceDate(todayStr()); setSuppConfirmed(false);
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
        <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-700 to-green-500 shadow-lg shrink-0">
          <PackagePlus size={20} className="text-white" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Stock In Entry</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record medicines received from suppliers. Stock updates automatically.</p>
        </div>
      </div>

      {/* ── Unified Stock Entry Form ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-green-100 shadow-md overflow-hidden">

        {/* Shared header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-green-700 to-green-500 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-green-200"><PackagePlus size={17} /></span>
            <h2 className="text-sm font-bold text-white tracking-wide">Stock Entry Form</h2>
          </div>
          {editIdx !== null && (
            <button onClick={() => { setForm(blank()); setEditIdx(null); }}
              className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors">
              <X size={13} /> Cancel Edit
            </button>
          )}
        </div>

        {/* ── Step 1: Supplier Details ── */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold shrink-0">1</span>
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-green-600" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Supplier Details</span>
            </div>
            {suppConfirmed && (
              <span className="ml-auto flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                <CheckCircle2 size={10} /> Confirmed
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <L t="Supplier Name *" />
              <SupplierSelect suppliers={suppliers} value={supplierId} onSelect={handlePickSupplier} />
            </div>

            <div>
              <L t="GST Number" />
              <input value={suppGst} onChange={e => setSuppGst(e.target.value.toUpperCase())}
                placeholder="Auto-filled / editable" maxLength={15}
                className={`${iCls} font-mono uppercase tracking-widest`} />
            </div>

            <div>
              <L t="Invoice Number" />
              <div className="relative">
                <Hash size={13} className="absolute left-3 top-2.5 text-gray-400" />
                <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                  placeholder="INV-2024-001" className={`${iCls} pl-8`} />
              </div>
            </div>

            <div>
              <L t="Invoice Date" />
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-2.5 text-gray-400" />
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                  className={`${iCls} pl-8`} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                if (!supplierId) { alert('Please select a supplier first'); return; }
                setSuppConfirmed(true);
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 shadow-sm active:scale-95 transition-all">
              <Check size={15} /> Confirm Supplier
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-dashed border-green-100" />

        {/* ── Step 2: Add Medicine Entry ── */}
        <div className="px-6 pt-4 pb-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold shrink-0">2</span>
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-green-600" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                {editIdx !== null ? `Editing Entry #${editIdx + 1}` : 'Add Medicine Entry'}
              </span>
            </div>
          </div>

          {/* Row 1: name, batch, expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <L t="Medicine Name *" />
              <MedicinePicker
                value={form.medicine_name}
                onChange={v => sf('medicine_name', v)}
                medicines={medicines}
                onSelect={pickMed}
              />
            </div>
            <div>
              <L t="Batch Number *" />
              <input value={form.batch_number} onChange={e => sf('batch_number', e.target.value)}
                placeholder="e.g. B-2024-001" className={`${iCls} font-mono uppercase`} />
            </div>
            <div>
              <L t="Expiry Date" />
              <input type="date" value={form.expiry_date} onChange={e => sf('expiry_date', e.target.value)}
                className={iCls} />
            </div>
          </div>

          {/* Row 2: qty, price, gst%, tax, disc%, disc */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <L t="Qty *" />
              <input type="number" min="1" value={form.qty} onChange={e => sf('qty', e.target.value)}
                placeholder="0" className={`${iCls} text-center font-bold`} />
            </div>
            <div>
              <L t="Purchase Price *" />
              <input type="number" step="0.01" min="0" value={form.price} onChange={e => sf('price', e.target.value)}
                placeholder="0.00" className={iCls} />
            </div>
            <div>
              <L t="GST %" />
              <select value={form.gst_pct} onChange={e => sf('gst_pct', e.target.value)}
                className={`${iCls} cursor-pointer`}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <L t="Tax Amount" />
              <input readOnly value={rupee(cForm.tax_amt)} className={roiCls} />
            </div>
            <div>
              <L t="Disc %" />
              <input type="number" min="0" max="100" step="0.1" value={form.disc_pct}
                onChange={e => sf('disc_pct', e.target.value)}
                placeholder="0" className={`${iCls} text-center`} />
            </div>
            <div>
              <L t="Disc Amount" />
              <input readOnly value={rupee(cForm.disc_amt)} className={roiCls} />
            </div>
          </div>

          {/* Final price + Add button */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Final Price:</span>
              <span className="text-2xl font-bold text-green-700">{rupee(cForm.final)}</span>
              {form.qty > 0 && (
                <span className="text-xs text-gray-400">
                  × {form.qty} = {rupee(cForm.final * (parseFloat(form.qty) || 0))}
                </span>
              )}
            </div>
            <button onClick={addOrUpdate} disabled={!canAdd}
              className={[
                'ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95',
                canAdd
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              ].join(' ')}>
              <Plus size={16} />
              {editIdx !== null ? 'Update Entry' : 'Add to List'}
            </button>
          </div>
        </div>

      </div>

      {/* ── 3. Stock Entry List ───────────────────────────────────────────── */}
      <Section
        icon={<ClipboardList size={17} />}
        title={`Stock Entry List${entries.length > 0 ? ` (${entries.length})` : ''}`}
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-300">
            <ClipboardList size={44} className="mb-3 opacity-40" />
            <p className="text-sm text-gray-400">No entries yet — add medicines above.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" style={{ minWidth: 900 }}>
                <thead className="bg-green-50 border-b border-green-100 text-green-800 uppercase tracking-wider font-bold">
                  <tr>
                    {['#', 'Medicine', 'Batch', 'Expiry', 'Qty', 'Price', 'GST%', 'Tax', 'Disc%', 'Disc', 'Final', ''].map(h => (
                      <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50">
                  {entries.map((e, i) => (
                    <tr key={i} className={`transition-colors ${editIdx === i ? 'bg-amber-50' : 'hover:bg-green-50/40'}`}>
                      <td className="px-3 py-2.5 text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[140px] truncate">{e.medicine_name}</td>
                      <td className="px-3 py-2.5 font-mono uppercase text-gray-600">{e.batch_number}</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {e.expiry_date
                          ? new Date(e.expiry_date + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-800">{e.qty}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{rupee(e.price)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-md px-1.5 py-0.5 font-semibold">{e.gst_pct}%</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-orange-700">{rupee(e.tax_amt)}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{e.disc_pct ? `${e.disc_pct}%` : '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-blue-700">{rupee(e.disc_amt)}</td>
                      <td className="px-3 py-2.5 font-bold text-green-700 font-mono">{rupee(e.final)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(i)} title="Edit"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => deleteRow(i)} title="Delete"
                            className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom bar */}
            <div className="px-6 py-4 border-t border-green-100 bg-green-50/30 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-gray-800">{entries.length}</span> medicine{entries.length > 1 ? 's' : ''} ·{' '}
                Total qty: <span className="font-bold">{entries.reduce((s, e) => s + (parseFloat(e.qty) || 0), 0)}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { if (window.confirm('Clear all entries?')) { setEntries([]); setForm(blank()); setEditIdx(null); } }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all">
                  <Trash2 size={15} /> Clear All
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 shadow-md shadow-green-200 active:scale-95 transition-all disabled:opacity-60">
                  <Save size={15} /> {saving ? 'Saving…' : 'Save Stock Entry'}
                </button>
              </div>
            </div>
          </>
        )}
      </Section>

    </div>
  );
}
