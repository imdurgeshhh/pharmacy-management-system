import React, { useState } from 'react';
import { Package, DollarSign, User, Calendar, Hash, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'gst_number') {
      const upper = value.toUpperCase();
      setForm(p => ({ ...p, gst_number: upper }));
      if (upper && !validateGST(upper)) setGstError('Invalid GST format (expected: 22AAAAA0000A1Z5)');
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
          <FormField
            label="Medicine Name"
            required
            name="medicine_name"
            value={form.medicine_name}
            onChange={handleChange}
            placeholder="e.g. Paracetamol 500mg…"
            icon={Package}
          />

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
