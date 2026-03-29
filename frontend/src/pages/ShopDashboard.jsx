import React from 'react';
import { ShoppingCart, Package, TrendingUp } from 'lucide-react';
import useStore from '../store/useStore';

const ShopDashboard = () => {
    const stats = { todaySales: 18450, inventoryItems: 150, lowStock: 4 };
    const user = useStore(state => state.user);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3">
                        Shopkeeper Dashboard <ShoppingCart className="text-[rgb(var(--color-secondary))] opacity-80" size={28} />
                    </h1>
                    <p className="text-sm font-medium text-[rgb(var(--text-body))] mt-1">
                        Welcome back, {user?.name}. Manage sales and inventory.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card-glass p-8 text-center">
                    <ShoppingCart size={48} className="mx-auto mb-4 text-[rgb(var(--color-primary))]" />
                    <h3 className="text-2xl font-bold text-[rgb(var(--text-heading))] mb-1">₹{stats.todaySales.toLocaleString()}</h3>
                    <p className="text-sm text-[rgb(var(--text-muted)) ] uppercase tracking-wide font-medium">Today's Sales</p>
                </div>
                <div className="card-glass p-8 text-center">
                    <Package size={48} className="mx-auto mb-4 text-emerald-500" />
                    <h3 className="text-2xl font-bold text-[rgb(var(--text-heading))] mb-1">{stats.inventoryItems}</h3>
                    <p className="text-sm text-[rgb(var(--text-muted))] uppercase tracking-wide font-medium">Inventory Items</p>
                </div>
                <div className="card-glass p-8 text-center">
                    <TrendingUp size={48} className="mx-auto mb-4 text-orange-500" />
                    <h3 className="text-2xl font-bold text-[rgb(var(--text-heading))] mb-1">{stats.lowStock}</h3>
                    <p className="text-sm text-[rgb(var(--text-muted))] uppercase tracking-wide font-medium">Low Stock Alerts</p>
                </div>
            </div>

            <div className="text-sm text-[rgb(var(--text-muted))] p-6 bg-[rgb(var(--color-primary))]/5 rounded-2xl border border-[rgb(var(--color-primary))]/10">
                <p className="font-medium text-[rgb(var(--text-body))] mb-2">💡 Quick Actions</p>
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                    <a href="/pos" className="btn-primary px-6 py-2 text-sm">New Sale</a>
                    <a href="/inventory" className="btn-secondary px-6 py-2 text-sm">Check Inventory</a>
                </div>
            </div>
        </div>
    );
};

export default ShopDashboard;

