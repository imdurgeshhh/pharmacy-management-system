import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axios';
import useStore from '../../store/useStore';
import {
  Users, Plus, Search, Trash2, Edit2, Phone, Mail, MapPin,
  FileSpreadsheet, FileText, Download, Building2
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../../utils/exportData';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import ConfirmModal from '../common/ConfirmModal';

const SUPPLIER_COLUMNS = [
  { key: 'name', label: 'Company Name' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
];

const SupplierList = () => {
  const isAdmin = useStore(state => state.isAdmin);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name || '',
      contact_person: sup.contact_person || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/suppliers/${confirmDeleteId}`);
      setSuppliers(prev => prev.filter(s => s.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete supplier');
    }
  };

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.contact_person?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Users size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white text-balance">Registered Suppliers</h2>
            <p className="text-xs text-slate-700 dark:text-slate-300">Directory of pharmaceutical vendors and distributors</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportToExcel(filtered, SUPPLIER_COLUMNS, 'Suppliers_Directory')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" aria-hidden="true" /> Excel
          </button>
          <button
            type="button"
            onClick={() => exportToPDF(filtered, SUPPLIER_COLUMNS, 'Suppliers Directory', 'Suppliers_Directory', [16, 185, 129])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText size={14} className="text-red-500" aria-hidden="true" /> PDF
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-[0.96]"
          >
            <Plus size={14} aria-hidden="true" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-slate-50/50 border-b border-slate-100">
        <label
          htmlFor="supplier-search"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Search Suppliers
        </label>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="supplier-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search suppliers by name, contact, phone, email…"
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10">
            <tr className="text-slate-600 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <th scope="col" className="px-4 py-3">Company</th>
              <th scope="col" className="px-4 py-3">Contact Person</th>
              <th scope="col" className="px-4 py-3">Phone</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Address</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Building2 size={32} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-xs font-medium">No suppliers registered</p>
                </td>
              </tr>
            ) : (
              filtered.map(sup => (
                <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{sup.name}</td>
                  <td className="px-4 py-3 text-slate-700">{sup.contact_person || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">{sup.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{sup.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{sup.address || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(sup)}
                        title="Edit supplier"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 size={14} aria-hidden="true" />
                      </button>
                      {isAdmin() && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(sup.id)}
                          title="Delete supplier"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Supplier &amp; Vendor Information
            </legend>
            <FormField
              label="Supplier / Company Name"
              required
              name="name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Cipla Pharma Ltd."
              icon={Building2}
            />
            <FormField
              label="Contact Person"
              name="contact_person"
              value={form.contact_person}
              onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))}
              placeholder="e.g. Rajesh Sharma"
              icon={Users}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Phone Number"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. 9876543210"
                icon={Phone}
              />
              <FormField
                label="Email Address"
                type="email"
                name="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="e.g. supplier@pharma.com"
                icon={Mail}
              />
            </div>
            <FormField
              label="Office / Warehouse Address"
              as="textarea"
              name="address"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="e.g. Plot 45, Industrial Area, Mumbai"
              rows={2}
            />
          </fieldset>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all active:scale-[0.96] disabled:opacity-50"
            >
              {loading ? 'Saving…' : (editingSupplier ? 'Update Supplier' : 'Save Supplier')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Delete Supplier?"
        message="Are you sure you want to remove this supplier from your directory?"
        confirmLabel="Delete Supplier"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default SupplierList;
