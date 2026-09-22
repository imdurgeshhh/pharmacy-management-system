import React, { useState, useEffect } from 'react';
import api from '../config/axios';
import useStore from '../store/useStore';
import {
    UserCheck, Plus, Edit2, Trash2,
    ToggleLeft, ToggleRight, Users, Phone, Mail, Award, Hash, Save
} from 'lucide-react';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import ConfirmModal from '../components/common/ConfirmModal';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Employees = () => {
    const user = useStore(state => state.user);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const emptyForm = {
        full_name: '', qualification: '', address: '', mobile_no: '',
        email: '', aadhar_number: '', password: '', confirm_password: '',
        role: 'shopkeeper'
    };
    const [formData, setFormData] = useState(emptyForm);

    const setField = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

    useEffect(() => {
        document.title = 'Employee Management — Pharma';
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await api.get('/employees');
            setEmployees(res.data);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoading(false);
        }
    };

    const showMsg = (msg, isError = false) => {
        if (isError) setError(msg);
        else setSuccess(msg);
        setTimeout(() => { setError(''); setSuccess(''); }, 4000);
    };

    const handleAdd = async () => {
        setError('');
        if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password) {
            return showMsg('Full Name, Email, Password and Confirm Password are required.', true);
        }
        if (formData.password.length < 8) {
            return showMsg('Password must be at least 8 characters long.', true);
        }
        if (formData.password !== formData.confirm_password) {
            return showMsg('Passwords do not match.', true);
        }
        try {
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                mobile_no: formData.mobile_no,
                qualification: formData.qualification,
                address: formData.address,
                aadhar_number: formData.aadhar_number,
            };

            if (formData.role === 'shopkeeper') {
                await api.post('/employees/shopkeeper', payload);
                showMsg('Shopkeeper created successfully. Credentials provisioned.');
            } else {
                await api.post('/employees', { ...payload, role: formData.role || 'employee' });
                showMsg('Employee registered successfully!');
            }

            setShowAddModal(false);
            setFormData(emptyForm);
            fetchEmployees();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to register account.', true);
        }
    };

    const handleEdit = async () => {
        setError('');
        try {
            await api.put(`/employees/${selectedEmployee.id}`, {
                full_name: formData.full_name,
                qualification: formData.qualification,
                address: formData.address,
                mobile_no: formData.mobile_no,
                email: formData.email,
                aadhar_number: formData.aadhar_number,
            });
            showMsg('Employee updated successfully!');
            setShowEditModal(false);
            fetchEmployees();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to update employee.', true);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/employees/${selectedEmployee.id}`);
            showMsg('Employee removed.');
            setShowDeleteModal(false);
            fetchEmployees();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to delete employee.', true);
        }
    };

    const handleToggle = async (emp) => {
        try {
            const res = await api.patch(`/employees/${emp.id}/toggle`);
            showMsg(`${res.data.employee.full_name} is now ${res.data.employee.is_active ? 'Active' : 'Inactive'}.`);
            fetchEmployees();
        } catch (err) {
            showMsg('Failed to toggle status.', true);
        }
    };

    const openEdit = (emp) => {
        setSelectedEmployee(emp);
        setFormData({
            full_name: emp.full_name || '',
            qualification: emp.qualification || '',
            address: emp.address || '',
            mobile_no: emp.mobile_no || '',
            email: emp.email || '',
            aadhar_number: emp.aadhar_number || '',
            password: '',
            confirm_password: ''
        });
        setShowEditModal(true);
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-10 lg:pl-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    {/* P6: h1 as primary heading */}
                    <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3">
                        <UserCheck className="text-[rgb(var(--color-primary))] opacity-80" size={32} aria-hidden="true" /> Employee Management
                    </h1>
                    <p className="text-sm font-medium text-[rgb(var(--text-body))] mt-1">
                        Manage staff accounts, roles, and permissions for your pharmacy.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => { setFormData({ ...emptyForm, role: 'shopkeeper' }); setShowAddModal(true); }}
                        className="btn-primary shadow-[rgb(var(--color-primary))]/30 flex items-center gap-2 whitespace-nowrap min-h-[44px]"
                    >
                        <UserCheck size={20} strokeWidth={2.5} aria-hidden="true" /> Register Shopkeeper
                    </button>
                    <button
                        onClick={() => { setFormData({ ...emptyForm, role: 'employee' }); setShowAddModal(true); }}
                        className="btn-secondary flex items-center gap-2 whitespace-nowrap min-h-[44px]"
                    >
                        <Plus size={20} strokeWidth={2.5} aria-hidden="true" /> Add Staff
                    </button>
                </div>
            </div>

            {/* Toast messages */}
            {success && (
                <div role="status" aria-live="polite" className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-xl font-medium animate-slide-up">
                    ✅ {success}
                </div>
            )}
            {error && (
                <div role="alert" aria-live="assertive" className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border border-red-200 p-3 rounded-xl font-medium animate-slide-up">
                    ❌ {error}
                </div>
            )}

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="card-glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center" aria-hidden="true">
                        <Users size={20} className="text-blue-700" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-[rgb(var(--text-heading))]">{employees.length}</p>
                        <p className="text-xs text-slate-700 font-semibold">Total Employees</p>
                    </div>
                </div>
                <div className="card-glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center" aria-hidden="true">
                        <ToggleRight size={20} className="text-emerald-700" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-[rgb(var(--text-heading))]">{employees.filter(e => e.is_active).length}</p>
                        <p className="text-xs text-slate-700 font-semibold">Active</p>
                    </div>
                </div>
                <div className="card-glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center" aria-hidden="true">
                        <ToggleLeft size={20} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-[rgb(var(--text-heading))]">{employees.filter(e => !e.is_active).length}</p>
                        <p className="text-xs text-slate-700 font-semibold">Inactive</p>
                    </div>
                </div>
            </div>

            {/* Employees Table */}
            <div className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl">
                {/* P5: scrollable region keyboard-focusable */}
                <div
                    className="overflow-x-auto no-scrollbar"
                    tabIndex={0}
                    role="region"
                    aria-label="Employees table"
                >
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-[rgb(var(--color-primary))]/10 to-transparent border-b border-[rgb(var(--border-subtle))]">
                                {/* P4: scope="col" on all th */}
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Name</th>
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">User ID</th>
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Mobile</th>
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Email</th>
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Qualification</th>
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs text-center">Role</th>
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs text-center">Status</th>
                                <th scope="col" className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="animate-pulse flex flex-col items-center gap-3 text-[rgb(var(--color-primary))]/50">
                                            <UserCheck size={32} className="animate-bounce" aria-hidden="true" />
                                            <span>Loading employees...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[rgb(var(--text-muted))]">
                                            <UserCheck size={40} className="opacity-30" aria-hidden="true" />
                                            <p className="font-medium">No employees registered yet.</p>
                                            <button onClick={() => { setFormData(emptyForm); setShowAddModal(true); }} className="btn-primary text-sm px-4 py-2 min-h-[44px]">
                                                Add First Employee
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, i) => (
                                    <tr
                                        key={emp.id}
                                        className="bg-transparent hover:bg-[rgb(var(--color-primary))]/5 transition-colors duration-200 animate-slide-up"
                                        style={{ animationDelay: `${i * 40}ms` }}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm" aria-hidden="true">
                                                    {emp.full_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span className="font-bold text-[rgb(var(--text-heading))] text-sm">{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-xs font-bold tabular-nums px-2 py-1 rounded-lg bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary))]/20">
                                                {emp.employee_id || emp.username}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm tabular-nums text-[rgb(var(--text-body))]">
                                            <div className="flex items-center gap-1.5"><Phone size={13} className="opacity-50" aria-hidden="true" /> {emp.mobile_no || '—'}</div>
                                        </td>
                                        <td className="p-4 text-sm text-[rgb(var(--text-body))]">
                                            <div className="flex items-center gap-1.5"><Mail size={13} className="opacity-50" aria-hidden="true" /> {emp.email || '—'}</div>
                                        </td>
                                        <td className="p-4 text-sm text-[rgb(var(--text-body))]">
                                            <div className="flex items-center gap-1.5"><Award size={13} className="opacity-50" aria-hidden="true" /> {emp.qualification || '—'}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {emp.role === 'shopkeeper' ? (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                                                    Shopkeeper
                                                </span>
                                            ) : emp.role === 'admin' ? (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    Employee
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleToggle(emp)}
                                                aria-label={emp.is_active ? `Deactivate ${emp.full_name}` : `Activate ${emp.full_name}`}
                                                aria-pressed={emp.is_active}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[44px] rounded-full text-xs font-bold border transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-1 ${
                                                    emp.is_active
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                                                        : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                                }`}
                                            >
                                                {emp.is_active
                                                    ? <><ToggleRight size={13} aria-hidden="true" /> Active</>
                                                    : <><ToggleLeft size={13} aria-hidden="true" /> Inactive</>}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(emp)}
                                                    className="text-[rgb(var(--color-primary))] hover:text-white hover:bg-[rgb(var(--color-primary))] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-1"
                                                    aria-label={`Edit ${emp.full_name}`}
                                                >
                                                    <Edit2 size={15} strokeWidth={2.5} aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedEmployee(emp); setShowDeleteModal(true); }}
                                                    className="text-red-600 hover:text-white hover:bg-red-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                                                    aria-label={`Delete ${emp.full_name}`}
                                                >
                                                    <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── ADD EMPLOYEE / SHOPKEEPER MODAL ── */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title={formData.role === 'shopkeeper' ? 'Register New Shopkeeper' : 'Register New Employee'}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-5">
                    {/* Visual & Semantic Group 0: Account Role */}
                    <fieldset className="border border-purple-200 dark:border-purple-800 rounded-2xl p-4 sm:p-5 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                        <legend className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 bg-white dark:bg-slate-800 rounded-md border border-purple-200 dark:border-purple-800 shadow-sm">
                            Account Type & Access Role
                        </legend>
                        <div>
                            <label htmlFor="field-role-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="field-role-select"
                                value={formData.role}
                                onChange={e => setField('role', e.target.value)}
                                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                            >
                                <option value="shopkeeper">Shopkeeper (Clerk credentials provisioned for POS & Inventory)</option>
                                <option value="employee">Staff / Counter Employee (Internal record)</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1.5">
                                {formData.role === 'shopkeeper'
                                    ? '🔐 Provisions a secure Clerk authentication account under your pharmacy business.'
                                    : 'Internal staff record without independent Clerk login.'}
                            </p>
                        </div>
                    </fieldset>

                    {/* Visual & Semantic Group 1: Personal & Contact Details */}
                    <fieldset className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                        <legend className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                            Personal & Contact Details
                        </legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <FormField
                                    label="Full Name"
                                    required
                                    name="full_name"
                                    placeholder="Enter full name"
                                    value={formData.full_name}
                                    onChange={e => setField('full_name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="field-auto-userid" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    User ID (Auto-Generated)
                                </label>
                                <div className="relative">
                                    <input
                                        id="field-auto-userid"
                                        type="text"
                                        readOnly
                                        disabled
                                        value="Will be assigned on save (EMP-XXXX)"
                                        className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-3 text-sm text-slate-700 dark:text-slate-300 font-medium cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            <FormField
                                label="Qualification"
                                name="qualification"
                                placeholder="e.g. B.Pharm, D.Pharm"
                                value={formData.qualification}
                                onChange={e => setField('qualification', e.target.value)}
                            />
                            <FormField
                                label="Mobile Number"
                                name="mobile_no"
                                type="tel"
                                placeholder="10-digit mobile"
                                value={formData.mobile_no}
                                onChange={e => setField('mobile_no', e.target.value)}
                            />
                            <FormField
                                label="Email"
                                required
                                name="email"
                                type="email"
                                placeholder="employee@email.com"
                                value={formData.email}
                                onChange={e => setField('email', e.target.value)}
                            />
                            <div className="sm:col-span-2">
                                <FormField
                                    label="Address"
                                    as="textarea"
                                    name="address"
                                    placeholder="Full address"
                                    value={formData.address}
                                    onChange={e => setField('address', e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <FormField
                                    label="Aadhar Number"
                                    name="aadhar_number"
                                    placeholder="12-digit Aadhar"
                                    value={formData.aadhar_number}
                                    onChange={e => setField('aadhar_number', e.target.value)}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Visual & Semantic Group 2: Security Credentials */}
                    <fieldset className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                        <legend className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                            Security & Account Credentials
                        </legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FormField
                                    label="Password"
                                    required
                                    type="password"
                                    name="password"
                                    placeholder="Min 8 characters"
                                    value={formData.password}
                                    onChange={e => setField('password', e.target.value)}
                                    aria-describedby={formData.role === 'shopkeeper' ? 'shopkeeper-pw-strength' : undefined}
                                />
                                {/* Strength meter only for Shopkeeper — the only Clerk-backed password */}
                                {formData.role === 'shopkeeper' && (
                                    <PasswordStrengthMeter
                                        password={formData.password}
                                        id="shopkeeper-pw-strength"
                                    />
                                )}
                            </div>
                            <FormField
                                label="Confirm Password"
                                required
                                type="password"
                                name="confirm_password"
                                placeholder="Re-enter password"
                                value={formData.confirm_password}
                                onChange={e => setField('confirm_password', e.target.value)}
                            />
                        </div>
                    </fieldset>

                    {error && (
                        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl font-medium">❌ {error}</div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary min-h-[44px]">Cancel</button>
                        <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2 min-h-[44px]">
                            <Save size={17} aria-hidden="true" /> {formData.role === 'shopkeeper' ? 'Provision Shopkeeper Account' : 'Register Staff Employee'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── EDIT EMPLOYEE MODAL ── */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={`Edit Employee — ${selectedEmployee?.employee_id}`}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-5">
                    {/* Visual & Semantic Group: Profile & Contact Details */}
                    <fieldset className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                        <legend className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                            Employee Profile & Contact Details
                        </legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <FormField
                                    label="Full Name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={e => setField('full_name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="field-edit-userid" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    User ID
                                </label>
                                <div className="relative">
                                    <input
                                        id="field-edit-userid"
                                        type="text"
                                        readOnly
                                        disabled
                                        value={selectedEmployee?.employee_id || ''}
                                        className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-3 text-sm text-slate-800 dark:text-slate-200 font-mono font-bold cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            <FormField
                                label="Qualification"
                                name="qualification"
                                value={formData.qualification}
                                onChange={e => setField('qualification', e.target.value)}
                            />
                            <FormField
                                label="Mobile Number"
                                name="mobile_no"
                                type="tel"
                                value={formData.mobile_no}
                                onChange={e => setField('mobile_no', e.target.value)}
                            />
                            <FormField
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={e => setField('email', e.target.value)}
                            />
                            <div className="sm:col-span-2">
                                <FormField
                                    label="Address"
                                    as="textarea"
                                    name="address"
                                    value={formData.address}
                                    onChange={e => setField('address', e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <FormField
                                    label="Aadhar Number"
                                    name="aadhar_number"
                                    value={formData.aadhar_number}
                                    onChange={e => setField('aadhar_number', e.target.value)}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {error && (
                        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl font-medium">❌ {error}</div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary min-h-[44px]">Cancel</button>
                        <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2 min-h-[44px]">
                            <Save size={17} aria-hidden="true" /> Save Changes
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── DELETE CONFIRM MODAL ── */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Remove Employee?"
                message={`Are you sure you want to permanently remove ${selectedEmployee?.full_name} (${selectedEmployee?.employee_id})?`}
                confirmLabel="Delete Employee"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
};

export default Employees;
