import React, { useState, useEffect } from 'react';
import api from '../config/axios';
import RoleGuard from '../components/RoleGuard';
import { Plus, Edit2, Trash2, Package, Pill, X, Save } from 'lucide-react';
import { format } from 'date-fns';


const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        medicine_name: '',
        brand_name: '',
        salt_composition: '',
        medicine_category: '',
        dosage_form: '',
        strength: '',
        barcode: '',
        description: ''
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory').catch(() => ({
                data: [
                    { id: 1, medicine_name: 'Paracetamol', brand_name: 'Crocin', salt_composition: 'Paracetamol 500mg', medicine_category: 'Painkiller', dosage_form: 'Tablet', strength: '500mg', barcode: '1234567890', total_stock: 150 },
                    { id: 2, medicine_name: 'Amoxicillin', brand_name: 'Mox', salt_composition: 'Amoxicillin 250mg', medicine_category: 'Antibiotic', dosage_form: 'Capsule', strength: '250mg', barcode: '0987654321', total_stock: 400 },
                    { id: 3, medicine_name: 'Vitamin C', brand_name: 'Celine', salt_composition: 'Vitamin C 1000mg', medicine_category: 'Supplement', dosage_form: 'Tablet', strength: '1000mg', barcode: '1122334455', total_stock: 0 },
                ]
            }));
            setInventory(res.data);
        } catch (error) {
            console.error('Failed to fetch inventory', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            medicine_name: item.medicine_name || '',
            brand_name: item.brand_name || '',
            salt_composition: item.salt_composition || '',
            medicine_category: item.medicine_category || '',
            dosage_form: item.dosage_form || '',
            strength: item.strength || '',
            barcode: item.barcode || '',
            description: item.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setShowDeleteModal(true);
    };

    const handleSaveEdit = async () => {
        try {
            await api.put(`/inventory/medicine/${editingItem.id}`, formData);
            setShowModal(false);
            setEditingItem(null);
            fetchInventory();
        } catch (error) {
            console.error('Failed to update medicine', error);
            alert('Failed to update medicine');
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await api.delete(`/inventory/medicine/${deletingItem.id}`);
            // Immediately remove the item from the local state
            setInventory(inventory.filter(item => item.id !== deletingItem.id));
            setShowDeleteModal(false);
            setDeletingItem(null);
        } catch (error) {
            console.error('Failed to delete medicine', error);
            alert('Failed to delete medicine');
        }
    };


    return (
        <div className="space-y-6 animate-fade-in relative z-10 lg:pl-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3">
                        <Package className="text-[rgb(var(--color-primary))] opacity-80" size={32} /> Central Inventory
                    </h1>
                    <p className="text-sm font-medium text-[rgb(var(--text-body))] mt-1">
                        Manage your complete catalog, track codes, and oversee stock levels globally.
                    </p>
                </div>
                <button className="btn-primary shadow-[rgb(var(--color-primary))]/30 flex items-center gap-2">
                    <Plus size={20} strokeWidth={3} /> Add Medicine
                </button>
            </div>

            <div className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-[rgb(var(--color-primary))]/10 to-transparent border-b border-[rgb(var(--border-subtle))]">
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Medicine</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Brand</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Salt Composition</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Category</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Form</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs">Strength</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs text-center">Stock</th>
                                <th className="p-4 font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="animate-pulse flex flex-col items-center gap-3 text-[rgb(var(--color-primary))]/50">
                                            <Package size={32} className="animate-bounce" /> Loading inventory...
                                        </div>
                                    </td>
                                </tr>
                            ) : inventory.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-[rgb(var(--text-muted))] font-medium">No inventory found.</td>
                                </tr>
                            ) : (
                                inventory.map((item, i) => (
                                    <tr
                                        key={item.id}
                                        className="bg-transparent hover:bg-[rgb(var(--color-primary))]/5 transition-colors duration-200 animate-slide-up"
                                        style={{ animationDelay: `${i * 50}ms` }}
                                    >
                                        <td className="p-4 font-bold text-[rgb(var(--text-heading))] tracking-tight text-sm">{item.medicine_name}</td>
                                        <td className="p-4 text-[rgb(var(--text-body))] font-medium text-sm">{item.brand_name || '-'}</td>
                                        <td className="p-4 text-[rgb(var(--text-muted))] text-sm">{item.salt_composition || '-'}</td>
                                        <td className="p-4 text-[rgb(var(--text-body))] font-medium text-sm">{item.medicine_category || '-'}</td>
                                        <td className="p-4 text-[rgb(var(--text-body))] text-sm">{item.dosage_form || '-'}</td>
                                        <td className="p-4 text-[rgb(var(--text-body))] text-sm">{item.strength || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm border ${item.total_stock <= 0 ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                item.total_stock < 20 ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                                                    'bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]/20'
                                                }`}>
                                                {item.total_stock} Units
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-center items-center gap-2">
                                            <button 
                                                onClick={() => handleEdit(item)}
                                                className="text-[rgb(var(--color-primary))] hover:text-white hover:bg-[rgb(var(--color-primary))] p-2 rounded-lg transition-all active:scale-90" 
                                                title="Edit"
                                            >
                                                <Edit2 size={16} strokeWidth={2.5} />
                                            </button>
                                            <RoleGuard requiredAdmin>
                                            <button 
                                                onClick={() => handleDelete(item)}
                                                className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all active:scale-90" 
                                                title="Delete"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                            </RoleGuard>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[rgb(var(--border-subtle))]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[rgb(var(--text-heading))]">Edit Medicine</h3>
                            <button onClick={() => setShowModal(false)} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-heading))]">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">Medicine Name</label>
                                <input
                                    type="text"
                                    value={formData.medicine_name}
                                    onChange={(e) => setFormData({...formData, medicine_name: e.target.value})}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">Brand Name</label>
                                <input
                                    type="text"
                                    value={formData.brand_name}
                                    onChange={(e) => setFormData({...formData, brand_name: e.target.value})}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">Salt Composition</label>
                                <input
                                    type="text"
                                    value={formData.salt_composition}
                                    onChange={(e) => setFormData({...formData, salt_composition: e.target.value})}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">Category</label>
                                <select
                                    value={formData.medicine_category}
                                    onChange={(e) => setFormData({...formData, medicine_category: e.target.value})}
                                    className="input-field"
                                >
                                    <option value="">Select Category</option>
                                    <option value="Antibiotic">Antibiotic</option>
                                    <option value="Painkiller">Painkiller</option>
                                    <option value="Supplement">Supplement</option>
                                    <option value="Cough & Cold">Cough & Cold</option>
                                    <option value="Allergy">Allergy</option>
                                    <option value="Gastrointestinal">Gastrointestinal</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">Dosage Form</label>
                                <select
                                    value={formData.dosage_form}
                                    onChange={(e) => setFormData({...formData, dosage_form: e.target.value})}
                                    className="input-field"
                                >
                                    <option value="">Select Form</option>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Capsule">Capsule</option>
                                    <option value="Syrup">Syrup</option>
                                    <option value="Injection">Injection</option>
                                    <option value="Cream">Cream</option>
                                    <option value="Gel">Gel</option>
                                    <option value="Drops">Drops</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">Strength</label>
                                <input
                                    type="text"
                                    value={formData.strength}
                                    onChange={(e) => setFormData({...formData, strength: e.target.value})}
                                    className="input-field"
                                    placeholder="e.g., 500mg"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">Barcode</label>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                                    className="input-field font-mono"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                            <button onClick={handleSaveEdit} className="flex-1 btn-primary flex items-center justify-center gap-2">
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-[rgb(var(--border-subtle))]">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-[rgb(var(--text-heading))] mb-2">Delete Medicine?</h3>
                            <p className="text-[rgb(var(--text-muted))] mb-6">
                                Are you sure you want to delete <strong>{deletingItem?.name}</strong>? This will also remove all inventory batches.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 btn-secondary">Cancel</button>
                                <button onClick={handleConfirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-xl transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Inventory;

