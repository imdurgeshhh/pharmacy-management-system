import React, { useState, useEffect } from 'react';
import api from '../config/axios';
import useStore from '../store/useStore';
import RoleGuard from '../components/RoleGuard';
import { Edit2, Trash2, Package, X, Save, Search, RotateCcw } from 'lucide-react';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import ConfirmModal from '../components/common/ConfirmModal';
import { formatQty } from '../utils/quantity';

const SCHEDULE_CONFIG = {
    NONE: {
        label: 'None / OTC',
        shortLabel: 'OTC / None',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-300/80 dark:border-slate-700',
        dotClass: 'bg-slate-400',
        description: 'Freely sold over the counter'
    },
    G: {
        label: 'Schedule G',
        shortLabel: 'Schedule G',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        dotClass: 'bg-blue-500',
        description: 'Requires caution & medical guidance'
    },
    H: {
        label: 'Schedule H',
        shortLabel: 'Schedule H',
        badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500',
        description: 'Prescription required to purchase'
    },
    H1: {
        label: 'Schedule H1',
        shortLabel: 'Schedule H1',
        badgeClass: 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300 dark:border-orange-800 font-semibold',
        dotClass: 'bg-orange-500',
        description: 'Prescription + Register tracking required'
    },
    X: {
        label: 'Schedule X',
        shortLabel: 'Schedule X',
        badgeClass: 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-300 dark:border-red-800 font-bold tracking-wide',
        dotClass: 'bg-red-600 motion-safe:animate-pulse',
        description: 'Strict Narcotic / Psychotropic control (duplicate Rx)'
    }
};

const DEFAULT_FORM_DATA = {
    medicine_name: '',
    brand_name: '',
    salt_composition: '',
    medicine_category: '',
    dosage_form: '',
    strength: '',
    barcode: '',
    description: '',
    schedule: 'NONE',
    units_per_strip: 1
};

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const inventoryVersion = useStore(state => state.inventoryVersion);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchedule, setSelectedSchedule] = useState('ALL');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);

    // Form state
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [errorMsg, setErrorMsg] = useState(null);

    // Set document title
    useEffect(() => {
        document.title = 'Central Inventory — Pharma';
    }, []);

    // Close modals on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showModal) setShowModal(false);
                if (showDeleteModal) setShowDeleteModal(false);
            }
        };
        if (showModal || showDeleteModal) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [showModal, showDeleteModal]);

    // Fetch inventory with debouncing for search/filter and invalidation trigger
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInventory(searchTerm, selectedSchedule);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedSchedule, inventoryVersion]);

    const fetchInventory = async (search = searchTerm, schedule = selectedSchedule) => {
        setLoading(true);
        try {
            const params = {};
            if (search && search.trim()) params.search = search.trim();
            if (schedule && schedule !== 'ALL') params.schedule = schedule;

            const res = await api.get('/inventory', { params });
            setInventory(Array.isArray(res.data) ? res.data : []);
            setFetchError('');
        } catch (error) {
            console.error('Failed to fetch inventory', error);
            setInventory([]);
            setFetchError(error.response?.data?.error || 'Failed to load inventory.');
        } finally {
            setLoading(false);
        }
    };


    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            medicine_name: item.medicine_name || item.name || '',
            brand_name: item.brand_name || '',
            salt_composition: item.salt_composition || '',
            medicine_category: item.medicine_category || '',
            dosage_form: item.dosage_form || '',
            strength: item.strength || '',
            barcode: item.barcode || '',
            description: item.description || '',
            schedule: item.schedule || 'NONE',
            units_per_strip: item.units_per_strip || 1
        });
        setErrorMsg(null);
        setShowModal(true);
    };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setShowDeleteModal(true);
    };

    const handleSave = async () => {
        setErrorMsg(null);
        try {
            if (editingItem) {
                await api.put(`/inventory/medicine/${editingItem.id}`, formData);
            } else {
                await api.post('/inventory/medicine', formData);
            }
            setShowModal(false);
            setEditingItem(null);
            fetchInventory(searchTerm, selectedSchedule);
        } catch (error) {
            console.error('Failed to save medicine', error);
            setErrorMsg(error.response?.data?.error || 'Failed to save medicine.');
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await api.delete(`/inventory/medicine/${deletingItem.id}`);
            setInventory(inventory.filter(item => item.id !== deletingItem.id));
            setShowDeleteModal(false);
            setDeletingItem(null);
        } catch (error) {
            console.error('Failed to delete medicine', error);
            setErrorMsg('Failed to delete medicine. Please try again.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-10 lg:pl-4">
            <div>
                <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3">
                    <Package className="text-[rgb(var(--color-primary))] opacity-80" size={32} aria-hidden="true" /> Central Inventory
                </h1>
                <p className="text-sm font-medium text-[rgb(var(--text-body))] mt-1">
                    Read-only view of current stock levels. To add new stock, use the <strong>Purchases</strong> section.
                </p>
            </div>

            {/* Search & Filter Toolbar */}
            <fieldset className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end justify-between bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
                <legend className="px-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Search &amp; Filter Catalog
                </legend>
                <div className="flex-1 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                    {/* Search Input */}
                    <div className="flex-1 min-w-[220px]">
                        <label htmlFor="inventory-search-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Search Medicines
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                            <input
                                id="inventory-search-input"
                                type="text"
                                placeholder="Search medicine, brand, salt composition…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoComplete="off"
                                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] transition-[border-color,box-shadow]"
                                aria-label="Search medicines"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full"
                                    aria-label="Clear search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Schedule Filter Dropdown */}
                    <div className="flex items-end gap-2">
                        <div className="min-w-[180px]">
                            <label htmlFor="inventory-schedule-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Filter by Schedule
                            </label>
                            <div className="relative">
                                <select
                                    id="inventory-schedule-select"
                                    value={selectedSchedule}
                                    onChange={(e) => setSelectedSchedule(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] transition-[border-color,box-shadow]"
                                    aria-label="Filter by Schedule"
                                >
                                    <option value="ALL">All Schedules</option>
                                    <option value="NONE">None / OTC (Over Counter)</option>
                                    <option value="G">Schedule G (Caution)</option>
                                    <option value="H">Schedule H (Rx Required)</option>
                                    <option value="H1">Schedule H1 (Controlled)</option>
                                    <option value="X">Schedule X (Narcotics)</option>
                                </select>
                            </div>
                        </div>

                        {(searchTerm || selectedSchedule !== 'ALL') && (
                            <button
                                type="button"
                                onClick={() => { setSearchTerm(''); setSelectedSchedule('ALL'); }}
                                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 shrink-0 h-[38px]"
                                title="Reset filters"
                            >
                                <RotateCcw size={14} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Count pill */}
                <div
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 self-center sm:self-end mb-2 px-2"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {loading ? 'Searching…' : `${inventory.length} medicine${inventory.length === 1 ? '' : 's'} found`}
                </div>
            </fieldset>

            <div className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl">
                <div
                    className="overflow-x-auto no-scrollbar"
                    tabIndex={0}
                    role="region"
                    aria-label="Inventory table"
                >
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-[rgb(var(--color-primary))]/10 to-transparent border-b border-[rgb(var(--border-subtle))]">
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Medicine</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Brand</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Salt Composition</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Category</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Schedule</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Form</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">Strength</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs text-center">Stock</th>
                                <th scope="col" className="p-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center">
                                        <div className="animate-pulse flex flex-col items-center gap-3 text-[rgb(var(--color-primary))]/50">
                                            <Package size={32} className="motion-safe:animate-bounce" aria-hidden="true" /> <span>Loading inventory…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : fetchError ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-red-700 font-medium" role="alert">{fetchError}</td>
                                </tr>
                            ) : inventory.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-[rgb(var(--text-muted))] font-medium">No inventory found.</td>
                                </tr>
                            ) : (
                                inventory.map((item, i) => {
                                    const sched = (item.schedule || 'NONE').toUpperCase();
                                    const schedConf = SCHEDULE_CONFIG[sched] || SCHEDULE_CONFIG.NONE;

                                    return (
                                        <tr
                                            key={item.id}
                                            className="bg-transparent hover:bg-[rgb(var(--color-primary))]/5 transition-colors duration-200 motion-safe:animate-slide-up"
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            <td className="p-4 font-bold text-[rgb(var(--text-heading))] tracking-tight text-sm max-w-[200px]">
                                                <span className="block truncate" title={item.medicine_name || item.name}>{item.medicine_name || item.name}</span>
                                            </td>
                                            <td className="p-4 text-[rgb(var(--text-body))] font-medium text-sm">{item.brand_name || '-'}</td>
                                            <td className="p-4 text-[rgb(var(--text-body))] text-sm max-w-[200px]">
                                                <span className="block truncate" title={item.salt_composition || ''}>{item.salt_composition || '-'}</span>
                                            </td>
                                            <td className="p-4 text-[rgb(var(--text-body))] font-medium text-sm">{item.medicine_category || '-'}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border tabular-nums ${schedConf.badgeClass}`}
                                                    title={`${schedConf.label}: ${schedConf.description}`}
                                                    aria-label={`${schedConf.label} – ${schedConf.description}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${schedConf.dotClass}`} aria-hidden="true" />
                                                    {schedConf.shortLabel}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[rgb(var(--text-body))] text-sm">{item.dosage_form || '-'}</td>
                                            <td className="p-4 text-[rgb(var(--text-body))] text-sm">{item.strength || '-'}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap shadow-sm border tabular-nums ${item.total_stock <= 0
                                                    ? 'bg-red-500/10 text-red-700 border-red-500/20'
                                                    : item.total_stock < 20
                                                        ? 'bg-orange-500/10 text-orange-700 border-orange-500/20'
                                                        : 'bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]/20'
                                                }`}>
                                                    {item.formatted_stock || formatQty(item.total_stock, item.units_per_strip)}
                                                </span>
                                            </td>
                                            <td className="p-4 flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="text-[rgb(var(--color-primary))] hover:text-white hover:bg-[rgb(var(--color-primary))] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-[background-color,color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
                                                    aria-label={`Edit ${item.medicine_name || item.name}`}
                                                >
                                                    <Edit2 size={16} strokeWidth={2.5} aria-hidden="true" />
                                                </button>
                                                <RoleGuard requiredAdmin>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="text-red-600 hover:text-white hover:bg-red-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-[background-color,color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                                        aria-label={`Delete ${item.medicine_name || item.name}`}
                                                    >
                                                        <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
                                                    </button>
                                                </RoleGuard>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setErrorMsg(null); }}
                title="Edit Medicine Details"
                maxWidth="max-w-lg"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                    {errorMsg && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"
                        >
                            <span className="font-semibold shrink-0">Error:</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    <fieldset className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                        <legend className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                            Medicine Specifications &amp; Classification
                        </legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                label="Medicine Name"
                                required
                                name="medicine_name"
                                placeholder="e.g. Paracetamol…"
                                value={formData.medicine_name}
                                onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                            />
                            <FormField
                                label="Brand Name"
                                name="brand_name"
                                placeholder="e.g. Crocin…"
                                value={formData.brand_name}
                                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                            />
                            <div className="sm:col-span-2">
                                <FormField
                                    label="Salt Composition"
                                    name="salt_composition"
                                    placeholder="e.g. Paracetamol 500mg…"
                                    value={formData.salt_composition}
                                    onChange={(e) => setFormData({ ...formData, salt_composition: e.target.value })}
                                />
                            </div>
                            <FormField
                                label="Category"
                                as="select"
                                name="medicine_category"
                                value={formData.medicine_category}
                                onChange={(e) => setFormData({ ...formData, medicine_category: e.target.value })}
                            >
                                <option value="">Select Category</option>
                                <option value="Antibiotic">Antibiotic</option>
                                <option value="Painkiller">Painkiller</option>
                                <option value="Supplement">Supplement</option>
                                <option value="Cough & Cold">Cough &amp; Cold</option>
                                <option value="Allergy">Allergy</option>
                                <option value="Gastrointestinal">Gastrointestinal</option>
                                <option value="Other">Other</option>
                            </FormField>
                            <FormField
                                label="Drug Schedule"
                                as="select"
                                name="schedule"
                                value={formData.schedule}
                                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                hint={SCHEDULE_CONFIG[formData.schedule]?.description}
                            >
                                <option value="NONE">None / OTC (Over the Counter)</option>
                                <option value="G">Schedule G (Medical Caution)</option>
                                <option value="H">Schedule H (Doctor's Rx Required)</option>
                                <option value="H1">Schedule H1 (Controlled Antibiotic / Sedative)</option>
                                <option value="X">Schedule X (Narcotics / Psychotropics)</option>
                            </FormField>
                            <FormField
                                label="Dosage Form"
                                as="select"
                                name="dosage_form"
                                value={formData.dosage_form}
                                onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                            >
                                <option value="">Select Form</option>
                                <option value="Tablet">Tablet</option>
                                <option value="Capsule">Capsule</option>
                                <option value="Syrup">Syrup</option>
                                <option value="Injection">Injection</option>
                                <option value="Cream">Cream</option>
                                <option value="Gel">Gel</option>
                                <option value="Drops">Drops</option>
                            </FormField>
                            <FormField
                                label="Strength"
                                name="strength"
                                placeholder="e.g. 500mg…"
                                value={formData.strength}
                                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                            />
                            <FormField
                                label="Barcode"
                                name="barcode"
                                placeholder="e.g. 1234567890…"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            />
                            <FormField
                                label="Units per Strip"
                                type="number"
                                min="1"
                                name="units_per_strip"
                                placeholder="10"
                                value={formData.units_per_strip}
                                disabled={Boolean(editingItem && Number(editingItem.total_stock) > 0)}
                                onChange={(e) => setFormData({ ...formData, units_per_strip: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                hint={Boolean(editingItem && Number(editingItem.total_stock) > 0)
                                    ? `Locked: Medicine has active stock (${editingItem.total_stock} units). Pack size can only be changed when stock is 0.`
                                    : "Tablets/capsules per strip (e.g. 10 or 15). Keep 1 for syrups or bottles."
                                }
                            />
                        </div>
                    </fieldset>
                    <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary min-h-[44px]">Cancel</button>
                        <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2 min-h-[44px]">
                            <Save size={18} aria-hidden="true" /> Save Changes
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Medicine?"
                message={`Are you sure you want to delete “${deletingItem?.medicine_name || deletingItem?.name}”? This will also remove all associated inventory batches.`}
                confirmLabel="Delete Medicine"
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
};

export default Inventory;
