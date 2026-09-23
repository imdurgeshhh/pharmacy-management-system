import React, { useState, useEffect, useRef } from 'react';
import { Package, DollarSign, User, Calendar, Hash, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import api from '../../config/axios';

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const validateGST = (val) => !val || GST_REGEX.test(val.toUpperCase());

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const today = () => new Date().toISOString().slice(0, 10);

const WholesaleSaleModal = ({ isOpen, onClose, onSaveSale, loading }) => {
  const [form, setForm] = useState({
    medicine_name: '',
    quantity: '',
    price_per_unit: '',
    gst_number: '',
    shopkeeper_name: '',
    sale_date: today()
  });
  const [gstError, setGstError] = useState('');
  const [inventory, setInventory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get('/inventory')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setInventory(data.map(m => ({
          id: m.id,
          label: m.name || m.medicine_name || '',
          mrp: parseFloat(m.mrp) || 0,
          purchase_price: parseFloat(m.purchase_price) || 0,
          stock_qty: parseFloat(m.total_stock) || 0,
        })).filter(m => m.label));
      })
      .catch(() => setInventory([]));
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hits = form.medicine_name && form.medicine_name.trim().length > 0
    ? inventory.filter(m => (m.label || '').toLowerCase().includes(form.medicine_name.toLowerCase())).slice(0, 8)
    : [];

  const handleSelectMedicine = (med) => {
    const unitPrice = med.mrp > 0 ? String(med.mrp) : (med.purchase_price > 0 ? String(med.purchase_price) : '');
    setForm(p => ({
      ...p,
      medicine_name: med.label,
      price_per_unit: unitPrice || p.price_per_unit,
    }));
    setShowSuggestions(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'gst_number') {
      const upper = value.toUpperCase();
      setForm(p => ({ ...p, gst_number: upper }));
      if (upper && !validateGST(upper)) setGstError('Invalid GST format (expected: 22AAAAA0000A1Z5)');
      else setGstError('');
      return;
    }
    if (name === 'medicine_name') {
      const match = inventory.find(m => (m.label || '').toLowerCase() === value.trim().toLowerCase());
      const unitPrice = match ? (match.mrp > 0 ? String(match.mrp) : (match.purchase_price > 0 ? String(match.purchase_price) : '')) : null;
      setForm(p => ({
        ...p,
        medicine_name: value,
        price_per_unit: unitPrice !== null && unitPrice !== '' ? unitPrice : p.price_per_unit,
      }));
      setShowSuggestions(true);
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
    const success = await onSaveSale(form);
    if (success) {
      setForm({
        medicine_name: '',
        quantity: '',
        price_per_unit: '',
        gst_number: '',
        shopkeeper_name: '',
        sale_date: today()
      });
      setGstError('');
    }
  };

  const preview = Number(form.quantity) * Number(form.price_per_unit) || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Wholesale Sale">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fieldset 1: Product & Buyer Information */}
        <fieldset className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Product &amp; Buyer Information
          </legend>
          <div ref={pickerRef} className="relative">
            <FormField
              label="Medicine Name"
              required
              name="medicine_name"
              value={form.medicine_name}
              onChange={handleChange}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. Paracetamol 500mg…"
              icon={Package}
            />
            {showSuggestions && hits.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                role="listbox"
                aria-label="Medicine suggestions"
              >
                {hits.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    type="button"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectMedicine(m);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold truncate">{m.label}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {m.mrp > 0 && (
                        <span className="text-blue-700 dark:text-blue-400 font-bold tabular-nums">₹{m.mrp.toFixed(2)}</span>
                      )}
                      {m.stock_qty !== undefined && (
                        <span className="text-slate-500 text-[10px] tabular-nums">Stock: {m.stock_qty}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormField
            label="Shopkeeper / Pharmacy Buyer"
            required
            name="shopkeeper_name"
            value={form.shopkeeper_name}
            onChange={handleChange}
            placeholder="e.g. Sharma Medical Store…"
            icon={User}
          />

          <FormField
            label="Sale Date"
            type="date"
            name="sale_date"
            value={form.sale_date}
            onChange={handleChange}
            icon={Calendar}
          />
        </fieldset>

        {/* Fieldset 2: Pricing & Tax Details */}
        <fieldset className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Pricing &amp; Tax Details
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Quantity Sold"
              required
              type="number"
              min="1"
              inputMode="numeric"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              placeholder="e.g. 100…"
            />
            <FormField
              label="Price Per Unit (₹)"
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              name="price_per_unit"
              value={form.price_per_unit}
              onChange={handleChange}
              placeholder="e.g. 25.50…"
              icon={DollarSign}
              hint={form.price_per_unit ? "Auto-fetched from stock entry" : undefined}
            />
          </div>

          {preview > 0 && (
            <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-3.5 flex items-center justify-between">
              <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">Subtotal Amount</span>
              <span className="text-lg font-display font-bold text-blue-700 tabular-nums">{fmt(preview)}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <FormField
              label="GST Number (Optional)"
              name="gst_number"
              value={form.gst_number}
              onChange={handleChange}
              placeholder="e.g. 22AAAAA0000A1Z5…"
              icon={Hash}
              error={gstError}
            />
            {form.gst_number && validateGST(form.gst_number) && form.gst_number.length === 15 && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={13} aria-hidden="true" /> Valid Indian GST number
              </p>
            )}
          </div>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-[0.96] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? 'Saving…' : <><ChevronRight size={16} aria-hidden="true" /> Save Sale</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WholesaleSaleModal;
