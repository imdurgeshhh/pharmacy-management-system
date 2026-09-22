import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axios';
import useStore from '../store/useStore';
import { Package, TrendingUp, Users } from 'lucide-react';
import WholesaleSalesTable from '../components/suppliers/WholesaleSalesTable';
import SupplierList from '../components/suppliers/SupplierList';
import WholesaleSaleModal from '../components/suppliers/WholesaleSaleModal';

const Suppliers = () => {
  const isAdmin = useStore(state => state.isAdmin);
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'suppliers'
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Suppliers & Wholesale — Pharma';
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const res = await api.get('/wholesale/sales');
      setSales(res.data);
    } catch (err) {
      console.error('Failed to fetch wholesale sales:', err);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleSaveSale = async (formData) => {
    setLoading(true);
    try {
      await api.post('/wholesale/sales', formData);
      setModalOpen(false);
      fetchSales();
      return true;
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add sale');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (id) => {
    try {
      await api.delete(`/wholesale/sales/${id}`);
      setSales(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Failed to delete sale');
    }
  };

  return (
    <div className="animate-fade-in relative z-10 lg:pl-4 flex flex-col gap-5" style={{ minHeight: 0 }}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="h2-fluid tracking-tight text-slate-900 dark:text-white flex items-center gap-3 text-balance">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg flex-shrink-0">
              <Package size={22} className="text-white" aria-hidden="true" />
            </span>
            Wholesale &amp; Supplier Hub
          </h1>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 ml-1 text-pretty">
            Track wholesale sales to pharmacies and manage your supplier vendors directory.
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
          role="tablist"
          aria-label="Suppliers section navigation"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sales'}
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === 'sales'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp size={15} aria-hidden="true" /> Wholesale Sales
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'suppliers'}
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={15} aria-hidden="true" /> Supplier Directory
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-white flex flex-col"
        style={{ minHeight: '76vh' }}
      >
        {activeTab === 'sales' ? (
          <WholesaleSalesTable
            sales={sales}
            search={search}
            onSearchChange={setSearch}
            onOpenAddModal={() => setModalOpen(true)}
            onDeleteSale={handleDeleteSale}
            isAdmin={isAdmin()}
          />
        ) : (
          <SupplierList />
        )}
      </div>

      {/* Add Wholesale Sale Modal */}
      <WholesaleSaleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaveSale={handleSaveSale}
        loading={loading}
      />
    </div>
  );
};

export default Suppliers;
