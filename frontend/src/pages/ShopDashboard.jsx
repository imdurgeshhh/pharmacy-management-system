import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, TrendingUp } from 'lucide-react';
import useStore from '../store/useStore';
import api from '../config/axios';

const ShopDashboard = () => {
    const user = useStore(state => state.user);
    const [stats, setStats] = useState({ todaySales: 0, inventoryItems: 0, lowStock: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = 'Shopkeeper Dashboard — Pharma';
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [invRes, salesRes] = await Promise.all([
                    api.get('/inventory'),
                    api.get('/sales'),
                ]);
                const inventory = Array.isArray(invRes.data) ? invRes.data : [];
                const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
                
                const todayStr = new Date().toISOString().slice(0, 10);
                const todaySalesTotal = sales
                    .filter(s => s.created_at && s.created_at.slice(0, 10) === todayStr)
                    .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
                const lowStockCount = inventory.filter(item => Number(item.stock_qty || 0) < 20).length;

                setStats({
                    todaySales: todaySalesTotal,
                    inventoryItems: inventory.length,
                    lowStock: lowStockCount,
                });
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load shop dashboard.');
                setStats({ todaySales: 0, inventoryItems: 0, lowStock: 0 });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3 text-balance">
                        Shopkeeper Dashboard <ShoppingCart className="text-[rgb(var(--color-secondary))] opacity-80" size={28} aria-hidden="true" />
                    </h1>
                    <p className="text-sm font-medium text-[rgb(var(--text-body))] mt-1 text-pretty">
                        Welcome back, {user?.name}. Manage sales and inventory.
                    </p>
                    {error && <p className="text-sm text-red-700 mt-2" role="alert">{error}</p>}
                    {loading && <p className="text-sm text-[rgb(var(--text-body))] mt-2">Loading dashboard…</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card-glass p-8 text-center">
                    <ShoppingCart size={48} className="mx-auto mb-4 text-[rgb(var(--color-primary))]" aria-hidden="true" />
                    <h3 className="text-2xl font-bold text-[rgb(var(--text-heading))] mb-1 tabular-nums">₹{Number(stats.todaySales).toLocaleString('en-IN')}</h3>
                    <p className="text-sm text-gray-700 uppercase tracking-wide font-semibold">Today's Sales</p>
                </div>
                <div className="card-glass p-8 text-center">
                    <Package size={48} className="mx-auto mb-4 text-emerald-600" aria-hidden="true" />
                    <h3 className="text-2xl font-bold text-[rgb(var(--text-heading))] mb-1 tabular-nums">{stats.inventoryItems}</h3>
                    <p className="text-sm text-gray-700 uppercase tracking-wide font-semibold">Inventory Items</p>
                </div>
                <div className="card-glass p-8 text-center">
                    <TrendingUp size={48} className="mx-auto mb-4 text-orange-700" aria-hidden="true" />
                    <h3 className="text-2xl font-bold text-[rgb(var(--text-heading))] mb-1 tabular-nums">{stats.lowStock}</h3>
                    <p className="text-sm text-gray-700 uppercase tracking-wide font-semibold">Low Stock Alerts</p>
                </div>
            </div>

            <div className="text-sm text-gray-700 p-6 bg-[rgb(var(--color-primary))]/5 rounded-2xl border border-[rgb(var(--color-primary))]/10">
                <p className="font-semibold text-[rgb(var(--text-body))] mb-2">💡 Quick Actions</p>
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                    <a href="/pos" className="btn-primary px-6 py-2 text-sm min-h-[44px] flex items-center justify-center">New Sale</a>
                    <a href="/inventory" className="btn-secondary px-6 py-2 text-sm min-h-[44px] flex items-center justify-center">Check Inventory</a>
                </div>
            </div>
        </div>
    );
};

export default ShopDashboard;
