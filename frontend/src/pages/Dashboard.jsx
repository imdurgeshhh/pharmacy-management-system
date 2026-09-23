import React, { useState, useEffect } from 'react';
import {
    FileText, IndianRupee, TrendingUp, Package, Clock,
    AlertTriangle, ShieldCheck, ShoppingBag, ArrowUpRight
} from 'lucide-react';
import api from '../config/axios';
import { format, differenceInDays, parseISO } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const rupee = (n) => `₹${fmt(n)}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, iconBg = 'bg-green-50', iconColor = 'text-green-700' }) => (
    <li className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 flex items-start justify-between gap-3 hover:shadow-md transition-shadow list-none">
        <div className="flex flex-col gap-1">
            {/* P1: text-gray-600 (vs text-gray-400) for 4.5:1 AA contrast */}
            <span className="text-xs font-medium text-gray-600 uppercase tracking-widest">{label}</span>
            <span className="text-2xl font-bold text-gray-800 leading-tight tabular-nums">{value}</span>
            {/* P1: text-gray-600 (vs text-gray-400) */}
            {sub && <span className="text-xs text-gray-600">{sub}</span>}
        </div>
        <div className={`${iconBg} p-2.5 rounded-xl shrink-0`} aria-hidden="true">
            <Icon size={18} className={iconColor} />
        </div>
    </li>
);

// ─── Alert Row ────────────────────────────────────────────────────────────────
const AlertRow = ({ name, batch, stock, expiry, type }) => {
    // P1: darkened badge text for 4.5:1 contrast
    const badge =
        type === 'expired'  ? { label: 'Expired',   cls: 'bg-red-100 text-red-800'    } :
        type === 'expiring' ? { label: 'Expiring',  cls: 'bg-amber-100 text-amber-800' } :
                              { label: 'Low Stock', cls: 'bg-gray-100 text-gray-700'   };

    return (
        <li className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 list-none">
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
                {/* P1: text-gray-600 instead of text-gray-400 */}
                <span className="text-xs text-gray-600">Batch: {batch} · Qty: {stock}</span>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                </span>
                {expiry && (
                    <span className="text-[10px] text-gray-600">
                        Exp: {format(parseISO(expiry), 'dd MMM yy')}
                    </span>
                )}
            </div>
        </li>
    );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, count }) => (
    <div className="flex items-center gap-2 mb-3">
        {/* P1: text-gray-600 instead of text-gray-400 */}
        <Icon size={14} className="text-gray-600" aria-hidden="true" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</span>
        {count !== undefined && (
            <span className="ml-auto text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                {count}
            </span>
        )}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
    const [stats, setStats]       = useState({ todaySales: 0, monthSales: 0, inventoryValue: 0, lowStockItems: 0 });
    const [salesData, setSalesData] = useState([]);
    const [alerts, setAlerts]     = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');

    useEffect(() => {
        document.title = 'Operations Dashboard — Pharma';
        const fetchDashboardData = async () => {
            setLoading(true);
            setError('');
            try {
                const [statsRes, salesRes, alertsRes] = await Promise.all([
                    api.get('/reports/dashboard'),
                    api.get('/reports/sales'),
                    api.get('/inventory/alerts'),
                ]);

                setStats(statsRes.data || { todaySales: 0, monthSales: 0, inventoryValue: 0, lowStockItems: 0 });
                const salesRows = Array.isArray(salesRes.data) ? salesRes.data : [];
                setSalesData(salesRows.map(d => ({
                    ...d,
                    sales: Number(d.sales || 0),
                    displayDate: d.date ? format(parseISO(String(d.date).slice(0, 10)), 'MMM dd') : d.date
                })));
                setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
            } catch (err) {
                console.error('Dashboard error', err);
                setError(err.response?.data?.error || 'Failed to load dashboard data.');
                setStats({ todaySales: 0, monthSales: 0, inventoryValue: 0, lowStockItems: 0 });
                setSalesData([]);
                setAlerts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    // ── Bucketed alerts ───────────────────────────────────────────────────────
    const today = new Date();
    const lowStock  = alerts.filter(a => a.stock_qty < 20);
    const expiring  = alerts.filter(a => {
        if (!a.expiry_date) return false;
        const d = differenceInDays(parseISO(a.expiry_date), today);
        return d >= 0 && d <= 90;
    });
    const expired   = alerts.filter(a => {
        if (!a.expiry_date) return false;
        return differenceInDays(parseISO(a.expiry_date), today) < 0;
    });

    // ── Derived stats ─────────────────────────────────────────────────────────
    const totalInvoices   = salesData.length;
    const totalRevenue    = salesData.reduce((s, d) => s + (d.sales || 0), 0);
    const monthRevenue    = Number(stats.monthSales || 0);
    const expiringCount   = expiring.length + expired.length;

    return (
        <div className="space-y-6 px-1 pb-10" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Page Title ── */}
            <div className="flex items-center justify-between">
                <div>
                    {/* P6: h1 as primary heading */}
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">Operations Dashboard</h1>
                    {/* P1: text-gray-600 vs text-gray-400 */}
                    <p className="text-sm text-gray-600 mt-0.5">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </p>
                    {error && (
                        <p className="text-sm text-red-700 mt-2" role="alert">{error}</p>
                    )}
                    {loading && (
                        <p className="text-sm text-gray-600 mt-2">Loading dashboard…</p>
                    )}
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <ul role="list" aria-label="Key operational statistics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 list-none p-0 m-0">
                <StatCard
                    label="Invoices"
                    value={totalInvoices}
                    sub="This week"
                    icon={FileText}
                    iconBg="bg-green-50"
                    iconColor="text-green-700"
                />
                <StatCard
                    label="Revenue"
                    value={rupee(stats.todaySales)}
                    sub="Today"
                    icon={IndianRupee}
                    iconBg="bg-green-50"
                    iconColor="text-green-700"
                />
                <StatCard
                    label="This Month"
                    value={rupee(monthRevenue)}
                    sub="Month sales"
                    icon={TrendingUp}
                    iconBg="bg-green-50"
                    iconColor="text-green-700"
                />
                <StatCard
                    label="Low Stock"
                    value={lowStock.length}
                    sub="Items below min"
                    icon={Package}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-700"
                />
                <StatCard
                    label="Expiring Soon"
                    value={expiringCount}
                    sub="Within 90 days"
                    icon={Clock}
                    iconBg="bg-red-50"
                    iconColor="text-red-700"
                />
            </ul>

            {/* ── Two-column: Live Alerts | Recent Sales ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Live Alerts */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <AlertTriangle size={15} className="text-amber-500" aria-hidden="true" />
                        <h2 className="text-sm font-bold text-gray-700 tracking-tight">Live Alerts</h2>
                    </div>

                    <ul role="list" aria-label="Live alerts by category" className="space-y-4 list-none p-0 m-0">
                        {/* Low Stock */}
                        <li className="mb-4">
                            <SectionHeader icon={Package} title="Low Stock Medicines" count={lowStock.length} />
                            {lowStock.length === 0 ? (
                                <p className="text-xs text-gray-600 py-2">No low-stock items.</p>
                            ) : (
                                <ul role="list" aria-label="Low stock medicines" className="divide-y divide-gray-50 list-none p-0 m-0">
                                    {lowStock.map((a, i) => (
                                        <AlertRow key={i} name={a.name} batch={a.batch_number} stock={a.stock_qty}
                                            expiry={a.expiry_date} type="low" />
                                    ))}
                                </ul>
                            )}
                        </li>

                        {/* Expiring in 90 days */}
                        <li className="mb-4">
                            <SectionHeader icon={Clock} title="Expiring in 90 Days" count={expiring.length} />
                            {expiring.length === 0 ? (
                                <p className="text-xs text-gray-600 py-2">None expiring in the next 90 days.</p>
                            ) : (
                                <ul role="list" aria-label="Medicines expiring within 90 days" className="divide-y divide-gray-50 list-none p-0 m-0">
                                    {expiring.map((a, i) => (
                                        <AlertRow key={i} name={a.name} batch={a.batch_number} stock={a.stock_qty}
                                            expiry={a.expiry_date} type="expiring" />
                                    ))}
                                </ul>
                            )}
                        </li>

                        {/* Already Expired */}
                        <li>
                            <SectionHeader icon={AlertTriangle} title="Already Expired" count={expired.length} />
                            {expired.length === 0 ? (
                                <div className="flex items-center gap-2 text-xs text-gray-600 py-2">
                                    <ShieldCheck size={13} className="text-green-600" aria-hidden="true" />
                                    No expired items on shelf.
                                </div>
                            ) : (
                                <ul role="list" aria-label="Expired medicines" className="divide-y divide-gray-50 list-none p-0 m-0">
                                    {expired.map((a, i) => (
                                        <AlertRow key={i} name={a.name} batch={a.batch_number} stock={a.stock_qty}
                                            expiry={a.expiry_date} type="expired" />
                                    ))}
                                </ul>
                            )}
                        </li>
                    </ul>
                </div>

                {/* Recent Sales */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <ShoppingBag size={15} className="text-green-700" aria-hidden="true" />
                            <h2 className="text-sm font-bold text-gray-700 tracking-tight">Recent Sales</h2>
                        </div>
                        {/* P1: text-green-700 for 4.5:1; P2: aria-label for link */}
                        <button
                            className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline min-h-[44px] px-1"
                            aria-label="View all recent sales"
                        >
                            View all <ArrowUpRight size={12} aria-hidden="true" />
                        </button>
                    </div>

                    {salesData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                            <ShoppingBag size={36} className="mb-2 opacity-40" aria-hidden="true" />
                            <p className="text-sm text-gray-600">No sales data available.</p>
                        </div>
                    ) : (
                        // P5: scrollable region keyboard-focusable
                        <div
                            className="overflow-x-auto"
                            tabIndex={0}
                            role="region"
                            aria-label="Recent sales table"
                        >
                            <table className="w-full text-sm">
                                <thead>
                                    {/* P1: text-gray-600 for headers; P4: scope="col" */}
                                    <tr className="text-xs uppercase tracking-wider text-gray-600 border-b border-gray-50">
                                        <th scope="col" className="text-left pb-3 font-semibold">Date</th>
                                        <th scope="col" className="text-right pb-3 font-semibold">Sales</th>
                                        <th scope="col" className="text-right pb-3 font-semibold">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(() => {
                                        const maxVal = Math.max(...salesData.map(d => d.sales || 0), 1);
                                        return salesData.map((d, i) => (
                                            <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="py-3 text-gray-700 font-medium">{d.displayDate || d.date}</td>
                                                <td className="py-3 text-right font-bold text-gray-800">{rupee(d.sales)}</td>
                                                <td className="py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
                                                            <div
                                                                className="h-full bg-green-500 rounded-full"
                                                                style={{ width: `${Math.round((d.sales / maxVal) * 100)}%` }}
                                                            />
                                                        </div>
                                                        {/* P1: text-gray-600 instead of text-gray-400 */}
                                                        <span className="text-xs text-gray-600 w-8 text-right">
                                                            {Math.round((d.sales / maxVal) * 100)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-gray-100">
                                        <td className="pt-3 text-xs font-bold text-gray-700 uppercase tracking-wider">Total</td>
                                        <td className="pt-3 text-right font-bold text-green-700">{rupee(totalRevenue)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
};

export default Dashboard;
