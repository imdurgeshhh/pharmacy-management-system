import React, { useState, useEffect } from 'react';
import api from '../config/axios';
import useStore from '../store/useStore';
import {
    UserCheck, Plus, Edit2, Trash2, X, Save, Eye, EyeOff,
    ToggleLeft, ToggleRight, Users, Phone, Mail, Award, Hash
} from 'lucide-react';

// ─── Moved OUTSIDE Employees so they don't get recreated on every render ───────

const InputField = ({ label, name, type = 'text', readOnly = false, placeholder = '', value, onChange }) => (
    <div>
        <label className="block text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1.5">{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(name, e.target.value)}
            readOnly={readOnly}
            placeholder={placeholder}
            className={`input-field text-sm ${readOnly ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
        />
    </div>
);

const PasswordField = ({ label, name, show, onToggle, value, onChange }) => (
    <div>
        <label className="block text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1.5">{label}</label>
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value || ''}
                onChange={e => onChange(name, e.target.value)}
                className="input-field text-sm pr-10"
            />
            <button type="button" onClick={onToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--color-primary))]">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    </div>
);

const Modal = ({ title, onClose, onSubmit, submitLabel, children }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-[rgb(var(--border-subtle))] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-[rgb(var(--border-subtle))] sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
                <h3 className="text-xl font-bold text-[rgb(var(--text-heading))]">{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="p-6">{children}</div>
            {onSubmit && (
                <div className="flex gap-3 p-6 pt-0">
                    <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                    <button onClick={onSubmit} className="flex-1 btn-primary flex items-center justify-center gap-2">
                        <Save size={17} /> {submitLabel || 'Save'}
                    </button>
                </div>
            )}
        </div>
    </div>
);

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
        email: '', aadhar_number: '', password: '', confirm_password: ''
    };
    const [formData, setFormData] = useState(emptyForm);

    // Stable field updater — avoids creating new function refs on every render
    const setField = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/employees?admin_id=${user?.id}`);
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
        if (formData.password !== formData.confirm_password) {
            return showMsg('Passwords do not match.', true);
        }
        try {
            await api.post('/employees', { ...formData, admin_id: user?.id });
            showMsg('Employee registered successfully!');
            setShowAddModal(false);
            setFormData(emptyForm);
            fetchEmployees();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to register employee.', true);
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
                    <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3">
                        <UserCheck className="text-[rgb(var(--color-primary))] opacity-80" size={32} /> Employee Management
                    </h1>
                    <p className="text-sm font-medium text-[rgb(var(--text-body))] mt-1">
                        Manage staff accounts, roles, and permissions for your pharmacy.
                    </p>
                </div>
                <button
                    onClick={() => { setFormData(emptyForm); setShowAddModal(true); }}
                    className="btn-primary shadow-[rgb(var(--color-primary))]/30 flex items-center gap-2 whitespace-nowrap"
                >
                    <Plus size={20} strokeWidth={3} /> Add Employee
                </button>
            </div>

            {/* Toast messages */}
            {success && (
                <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-xl font-medium animate-slide-up">
                    ✅ {success}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-xl font-medium animate-slide-up">
                    ❌ {error}
                </div>
            )}

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="card-glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Users size={20} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[rgb(var(--text-heading))]">{employees.length}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))] font-medium">Total Employees</p>
                    </div>
                </div>
                <div className="card-glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <ToggleRight size={20} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[rgb(var(--text-heading))]">{employees.filter(e => e.is_active).length}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))] font-medium">Active</p>
                    </div>
                </div>
                <div className="card-glass p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <ToggleLeft size={20} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[rgb(var(--text-heading))]">{employees.filter(e => !e.is_active).length}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))] font-medium">Inactive</p>
                    </div>
                </div>
            </div>

            {/* Employees Table */}
            <div className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-[rgb(var(--color-primary))]/10 to-transparent border-b border-[rgb(var(--border-subtle))]">
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Name</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">User ID</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Mobile</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Email</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Qualification</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs text-center">Role</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs text-center">Status</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="animate-pulse flex flex-col items-center gap-3 text-[rgb(var(--color-primary))]/50">
                                            <UserCheck size={32} className="animate-bounce" /> Loading employees...
                                        </div>
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[rgb(var(--text-muted))]">
                                            <UserCheck size={40} className="opacity-30" />
                                            <p className="font-medium">No employees registered yet.</p>
                                            <button onClick={() => { setFormData(emptyForm); setShowAddModal(true); }} className="btn-primary text-sm px-4 py-2">
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
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                                    {emp.full_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span className="font-bold text-[rgb(var(--text-heading))] text-sm">{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))] border border-[rgb(var(--color-primary))]/20">
                                                {emp.employee_id || emp.username}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-[rgb(var(--text-body))]">
                                            <div className="flex items-center gap-1.5"><Phone size={13} className="opacity-50" /> {emp.mobile_no || '—'}</div>
                                        </td>
                                        <td className="p-4 text-sm text-[rgb(var(--text-body))]">
                                            <div className="flex items-center gap-1.5"><Mail size={13} className="opacity-50" /> {emp.email || '—'}</div>
                                        </td>
                                        <td className="p-4 text-sm text-[rgb(var(--text-body))]">
                                            <div className="flex items-center gap-1.5"><Award size={13} className="opacity-50" /> {emp.qualification || '—'}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                Employee
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleToggle(emp)}
                                                title={emp.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                                                    emp.is_active
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                                                        : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200'
                                                }`}
                                            >
                                                {emp.is_active
                                                    ? <><ToggleRight size={13} /> Active</>
                                                    : <><ToggleLeft size={13} /> Inactive</>}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(emp)}
                                                    className="text-[rgb(var(--color-primary))] hover:text-white hover:bg-[rgb(var(--color-primary))] p-2 rounded-lg transition-all active:scale-90"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={15} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedEmployee(emp); setShowDeleteModal(true); }}
                                                    className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all active:scale-90"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} strokeWidth={2.5} />
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

            {/* ── ADD EMPLOYEE MODAL ── */}
            {showAddModal && (
                <Modal title="Register New Employee" onClose={() => setShowAddModal(false)} onSubmit={handleAdd} submitLabel="Register Employee">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <InputField label="Full Name *" name="full_name" placeholder="Enter full name" value={formData.full_name} onChange={setField} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1.5">User ID (Auto-Generated)</label>
                            <div className="input-field text-sm opacity-60 cursor-not-allowed bg-gray-50 flex items-center gap-2 text-[rgb(var(--text-muted))]">
                                <Hash size={14} /> Will be assigned on save (EMP-XXXX)
                            </div>
                        </div>
                        <InputField label="Qualification" name="qualification" placeholder="e.g. B.Pharm, D.Pharm" value={formData.qualification} onChange={setField} />
                        <InputField label="Mobile Number" name="mobile_no" type="tel" placeholder="10-digit mobile" value={formData.mobile_no} onChange={setField} />
                        <InputField label="Email *" name="email" type="email" placeholder="employee@email.com" value={formData.email} onChange={setField} />
                        <div className="sm:col-span-2">
                            <InputField label="Address" name="address" placeholder="Full address" value={formData.address} onChange={setField} />
                        </div>
                        <div className="sm:col-span-2">
                            <InputField label="Aadhar Number" name="aadhar_number" placeholder="12-digit Aadhar" value={formData.aadhar_number} onChange={setField} />
                        </div>
                        <PasswordField label="Password *" name="password" show={showPassword} onToggle={() => setShowPassword(p => !p)} value={formData.password} onChange={setField} />
                        <PasswordField label="Confirm Password *" name="confirm_password" show={showConfirmPassword} onToggle={() => setShowConfirmPassword(p => !p)} value={formData.confirm_password} onChange={setField} />
                    </div>
                    {error && (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">❌ {error}</div>
                    )}
                </Modal>
            )}

            {/* ── EDIT EMPLOYEE MODAL ── */}
            {showEditModal && (
                <Modal title={`Edit Employee — ${selectedEmployee?.employee_id}`} onClose={() => setShowEditModal(false)} onSubmit={handleEdit} submitLabel="Save Changes">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <InputField label="Full Name" name="full_name" value={formData.full_name} onChange={setField} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1.5">User ID</label>
                            <div className="input-field text-sm opacity-60 cursor-not-allowed bg-gray-50 font-mono font-bold text-[rgb(var(--color-primary))]">
                                {selectedEmployee?.employee_id}
                            </div>
                        </div>
                        <InputField label="Qualification" name="qualification" value={formData.qualification} onChange={setField} />
                        <InputField label="Mobile Number" name="mobile_no" type="tel" value={formData.mobile_no} onChange={setField} />
                        <InputField label="Email" name="email" type="email" value={formData.email} onChange={setField} />
                        <div className="sm:col-span-2">
                            <InputField label="Address" name="address" value={formData.address} onChange={setField} />
                        </div>
                        <div className="sm:col-span-2">
                            <InputField label="Aadhar Number" name="aadhar_number" value={formData.aadhar_number} onChange={setField} />
                        </div>
                    </div>
                    {error && (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">❌ {error}</div>
                    )}
                </Modal>
            )}

            {/* ── DELETE CONFIRM MODAL ── */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-[rgb(var(--border-subtle))]">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-[rgb(var(--text-heading))] mb-2">Remove Employee?</h3>
                            <p className="text-[rgb(var(--text-muted))] mb-1">
                                Are you sure you want to permanently remove
                            </p>
                            <p className="font-bold text-[rgb(var(--text-heading))] mb-6">{selectedEmployee?.full_name} ({selectedEmployee?.employee_id})</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 btn-secondary">Cancel</button>
                                <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-xl transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
