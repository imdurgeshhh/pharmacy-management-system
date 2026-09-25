import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Award, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Save
} from 'lucide-react';
import Modal from './common/Modal';
import FormField from './common/FormField';
import api from '../config/axios';
import useStore from '../store/useStore';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StoreSettingsModal({ isOpen, onClose, onSaved }) {
  const user = useStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generalError, setGeneralError] = useState('');
  
  const [formData, setFormData] = useState({
    shop_name: '',
    address: '',
    phone: '',
    email: '',
    dl_no: '',
    gstin: '',
    food_lic_no: '',
    pan_no: '',
    aadhar_no: '',
    pharmacist_name: '',
    pharmacist_reg_no: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setSuccessMessage('');
      setGeneralError('');
      setErrors({});
      return;
    }

    if (user?.role !== 'admin') {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setGeneralError('');
    setSuccessMessage('');

    api.get('/store')
      .then((res) => {
        if (!isMounted) return;
        const data = res.data || {};
        setFormData({
          shop_name: data.shop_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          dl_no: data.dl_no || '',
          gstin: data.gstin || '',
          food_lic_no: data.food_lic_no || '',
          pan_no: data.pan_no || '',
          aadhar_no: data.aadhar_no || '',
          pharmacist_name: data.pharmacist_name || '',
          pharmacist_reg_no: data.pharmacist_reg_no || '',
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load store settings:', err);
        setGeneralError(err.response?.data?.error || 'Could not load existing store settings.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.role]);

  if (user?.role !== 'admin') {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.shop_name.trim()) {
      errs.shop_name = 'Pharmacy / Store Name is required';
    }
    if (!formData.address.trim()) {
      errs.address = 'Complete Address is required';
    }
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      errs.phone = 'Mobile / Phone Number is required';
    } else if (!PHONE_REGEX.test(cleanPhone)) {
      errs.phone = 'Mobile must be a valid 10-digit number';
    }
    if (!formData.dl_no.trim()) {
      errs.dl_no = 'Drug Licence Number is required';
    }
    const cleanEmail = formData.email.trim();
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      errs.email = 'Invalid email address format';
    }
    const cleanGstin = formData.gstin.trim();
    if (cleanGstin && !GSTIN_REGEX.test(cleanGstin)) {
      errs.gstin = 'GSTIN must be 15 alphanumeric characters (e.g. 22AAAAA0000A1Z5)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setGeneralError('');

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        shop_name: formData.shop_name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        dl_no: formData.dl_no.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        food_lic_no: formData.food_lic_no ? formData.food_lic_no.trim() : '',
        pan_no: formData.pan_no ? formData.pan_no.trim().toUpperCase() : '',
        aadhar_no: formData.aadhar_no ? formData.aadhar_no.trim() : '',
        pharmacist_name: formData.pharmacist_name.trim(),
        pharmacist_reg_no: formData.pharmacist_reg_no.trim(),
      };

      const res = await api.put('/store', payload);
      setSuccessMessage('Store & Pharmacy details saved successfully!');
      if (onSaved) {
        onSaved(res.data);
      }
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (err) {
      console.error('Failed to save store settings:', err);
      setGeneralError(err.response?.data?.error || 'Failed to update store settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store / Pharmacy Profile Settings"
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-sm text-slate-500 font-medium">Loading store profile...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {successMessage && (
            <div
              role="alert"
              className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fade-in"
            >
              <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {generalError && (
            <div
              role="alert"
              className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-medium animate-shake"
            >
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            These details appear automatically on all generated GST Tax Invoices and POS receipts.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Pharmacy / Store Name"
              name="shop_name"
              value={formData.shop_name}
              onChange={handleChange}
              placeholder="e.g. Apex Health & Meds"
              required
              error={errors.shop_name}
              icon={Building2}
              className="md:col-span-2"
            />

            <FormField
              as="textarea"
              label="Complete Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Shop No, Building, Road, City, State, PIN"
              required
              rows={3}
              error={errors.address}
              className="md:col-span-2"
            />

            <FormField
              label="Mobile / Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              required
              error={errors.phone}
              icon={Phone}
              maxLength={10}
            />

            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="store@domain.com"
              error={errors.email}
              icon={Mail}
            />

            <FormField
              label="Drug Licence Number (D.L. No.)"
              name="dl_no"
              value={formData.dl_no}
              onChange={handleChange}
              placeholder="e.g. 20B/21B-XXXXX"
              required
              error={errors.dl_no}
              icon={FileText}
            />

            <FormField
              label="GSTIN (Goods and Services Tax)"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="15-character GSTIN (e.g. 22AAAAA0000A1Z5)"
              error={errors.gstin}
              icon={Award}
              maxLength={15}
            />

            <FormField
              label="Food Licence (FSSAI) Number"
              name="food_lic_no"
              value={formData.food_lic_no}
              onChange={handleChange}
              placeholder="14-digit FSSAI Lic No."
              error={errors.food_lic_no}
              icon={FileText}
            />

            <FormField
              label="Permanent Account Number (PAN)"
              name="pan_no"
              value={formData.pan_no}
              onChange={handleChange}
              placeholder="10-digit PAN (e.g. ABCDE1234F)"
              error={errors.pan_no}
              icon={Award}
              maxLength={10}
            />

            <FormField
              label="Aadhar Number (Optional)"
              name="aadhar_no"
              value={formData.aadhar_no}
              onChange={handleChange}
              placeholder="12-digit Aadhar No."
              error={errors.aadhar_no}
              icon={FileText}
              maxLength={14}
            />

            <FormField
              label="Registered Pharmacist Name"
              name="pharmacist_name"
              value={formData.pharmacist_name}
              onChange={handleChange}
              placeholder="e.g. Dr. Ramesh Kumar"
              error={errors.pharmacist_name}
              icon={UserCheck}
            />

            <FormField
              label="Pharmacist Registration No."
              name="pharmacist_reg_no"
              value={formData.pharmacist_reg_no}
              onChange={handleChange}
              placeholder="State Pharmacy Council Reg No."
              error={errors.pharmacist_reg_no}
              icon={FileText}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Store Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
