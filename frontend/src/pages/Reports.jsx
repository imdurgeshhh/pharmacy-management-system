import React, { useState, useEffect } from 'react';
import api from '../config/axios';
import { format } from 'date-fns';
import { Download, Layers, ShoppingCart, TrendingUp, Receipt, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportData';

const toDateLabel = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return format(parsed, 'MMM dd, yyyy');
};

const mapWholesalePurchase = (row) => ({
    id: row.id,
    date: row.purchase_date || row.created_at,
    supplier: row.supplier_name || '—',
    item: row.medicine_name || '—',
    qty: Number(row.quantity || 0),
    rate: Number(row.price_per_unit || 0),
    total: Number(row.total_amount || 0),
});

const mapWholesaleSale = (row) => ({
    id: row.id,
    date: row.sale_date || row.created_at,
    buyer: row.shopkeeper_name || '—',
    item: row.medicine_name || '—',
    qty: Number(row.quantity || 0),
    rate: Number(row.price_per_unit || 0),
    total: Number(row.total_amount || 0),
});

const mapCustomerBilling = (row) => ({
    id: row.id,
    date: row.created_at,
    customer: row.customer_name || 'Walk-in',
    invoice: row.invoice_no || (row.id != null ? `SM${String(row.id).padStart(6, '0')}` : '—'),
    items: row.items || '—',
    total: Number(row.total_amount || 0),
    status: row.payment_mode || '—',
});

// ── Tab Config ───────────────────────────────────────────────────────────────
const TABS = [
    {
        key: 'wholesale-purchase',
        label: 'Wholesale Purchase',
        icon: ShoppingCart,
        activeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 shadow-sm',
        badgeClass: 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100',
        tableHeaderClass: 'from-emerald-600/10 dark:from-emerald-400/10',
        iconColor: 'text-emerald-700 dark:text-emerald-400',
        amountPill: 'text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700',
    },
    {
        key: 'wholesale-sale',
        label: 'Wholesale Sale',
        icon: TrendingUp,
        activeClass: 'bg-green-100 dark:bg-green-950/60 text-green-900 dark:text-green-200 border-green-300 dark:border-green-700 shadow-sm',
        badgeClass: 'bg-green-200 dark:bg-green-900/80 text-green-950 dark:text-green-100',
        tableHeaderClass: 'from-green-600/10 dark:from-green-400/10',
        iconColor: 'text-green-700 dark:text-green-400',
        amountPill: 'text-green-900 dark:text-green-200 bg-green-100 dark:bg-green-950/60 border border-green-300 dark:border-green-700',
    },
    {
        key: 'customer-billing',
        label: 'Customer Billing',
        icon: Receipt,
        activeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700 shadow-sm',
        badgeClass: 'bg-purple-200 dark:bg-purple-900/80 text-purple-950 dark:text-purple-100',
        tableHeaderClass: 'from-purple-600/10 dark:from-purple-400/10',
        iconColor: 'text-purple-700 dark:text-purple-400',
        amountPill: 'text-purple-900 dark:text-purple-200 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700',
    },
];

// ── Status Badge – P1: accessible inline colors with sufficient contrast ─────
const StatusBadge = ({ status }) => {
    const styles = {
        Paid:    'bg-emerald-100 text-emerald-800 border border-emerald-200',
        Cash:    'bg-emerald-100 text-emerald-800 border border-emerald-200',
        UPI:     'bg-emerald-100 text-emerald-800 border border-emerald-200',
        Card:    'bg-blue-100 text-blue-800 border border-blue-200',
        Credit:  'bg-amber-100 text-amber-800 border border-amber-200',
        Pending: 'bg-amber-100 text-amber-800 border border-amber-200',
        Overdue: 'bg-red-100 text-red-700 border border-red-200',
    };
    const cls = styles[status] || 'bg-slate-100 text-slate-800 border border-slate-200';
    return (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${cls}`}>
            {status}
        </span>
    );
};

// ── Reusable scrollable table wrapper ────────────────────────────────────────
// P5: tabIndex + role="region" + aria-label for keyboard access
const ScrollTable = ({ label, children }) => (
    <div
        className="overflow-x-auto no-scrollbar"
        tabIndex={0}
        role="region"
        aria-label={label}
    >
        {children}
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Reports = () => {
    const [activeTab, setActiveTab] = useState('wholesale-purchase');
    const [wholesalePurchases, setWholesalePurchases] = useState([]);
    const [wholesaleSales, setWholesaleSales] = useState([]);
    const [customerBilling, setCustomerBilling] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = 'Ledger & Reports — Pharma';
        const fetchReports = async () => {
            setLoading(true);
            setError('');
            try {
                const [salesRes, wholesalePurchaseRes, wholesaleSaleRes] = await Promise.all([
                    api.get('/sales'),
                    api.get('/wholesale/purchases'),
                    api.get('/wholesale/sales'),
                ]);
                setCustomerBilling((Array.isArray(salesRes.data) ? salesRes.data : []).map(mapCustomerBilling));
                setWholesalePurchases((Array.isArray(wholesalePurchaseRes.data) ? wholesalePurchaseRes.data : []).map(mapWholesalePurchase));
                setWholesaleSales((Array.isArray(wholesaleSaleRes.data) ? wholesaleSaleRes.data : []).map(mapWholesaleSale));
            } catch (err) {
                console.error(err);
                setError(err.response?.data?.error || 'Failed to load reports.');
                setCustomerBilling([]);
                setWholesalePurchases([]);
                setWholesaleSales([]);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const activeTabConfig = TABS.find(t => t.key === activeTab);
    const accentColor = `rgb(${activeTabConfig?.color})`;

    const handleExportExcel = () => {
        if (activeTab === 'wholesale-purchase') {
            const columns = [
                { key: 'date', label: 'Date' },
                { key: 'supplier', label: 'Supplier' },
                { key: 'item', label: 'Item / Medicine' },
                { key: 'qty', label: 'Quantity' },
                { key: 'rate', label: 'Rate (INR)' },
                { key: 'total', label: 'Total (INR)' },
            ];
            exportToExcel(wholesalePurchases, columns, 'Wholesale_Purchase_Report');
        } else if (activeTab === 'wholesale-sale') {
            const columns = [
                { key: 'date', label: 'Date' },
                { key: 'buyer', label: 'Buyer' },
                { key: 'item', label: 'Item / Medicine' },
                { key: 'qty', label: 'Quantity' },
                { key: 'rate', label: 'Rate (INR)' },
                { key: 'total', label: 'Total (INR)' },
            ];
            exportToExcel(wholesaleSales, columns, 'Wholesale_Sales_Report');
        } else {
            const columns = [
                { key: 'date', label: 'Date' },
                { key: 'customer', label: 'Customer Name' },
                { key: 'invoice', label: 'Invoice No' },
                { key: 'items', label: 'Items' },
                { key: 'total', label: 'Total (INR)' },
                { key: 'status', label: 'Payment Status' },
            ];
            exportToExcel(customerBilling, columns, 'Customer_Billing_Report');
        }
    };

    const handleExportPDF = () => {
        if (activeTab === 'wholesale-purchase') {
            const columns = [
                { key: 'date', label: 'Date' },
                { key: 'supplier', label: 'Supplier' },
                { key: 'item', label: 'Item / Medicine' },
                { key: 'qty', label: 'Quantity' },
                { key: 'rate', label: 'Rate (INR)' },
                { key: 'total', label: 'Total (INR)' },
            ];
            exportToPDF(wholesalePurchases, columns, 'Wholesale Purchase Report', 'Wholesale_Purchase_Report', [16, 185, 129]);
        } else if (activeTab === 'wholesale-sale') {
            const columns = [
                { key: 'date', label: 'Date' },
                { key: 'buyer', label: 'Buyer' },
                { key: 'item', label: 'Item / Medicine' },
                { key: 'qty', label: 'Quantity' },
                { key: 'rate', label: 'Rate (INR)' },
                { key: 'total', label: 'Total (INR)' },
            ];
            exportToPDF(wholesaleSales, columns, 'Wholesale Sales Report', 'Wholesale_Sales_Report', [59, 130, 246]);
        } else {
            const columns = [
                { key: 'date', label: 'Date' },
                { key: 'customer', label: 'Customer Name' },
                { key: 'invoice', label: 'Invoice No' },
                { key: 'items', label: 'Items' },
                { key: 'total', label: 'Total (INR)' },
                { key: 'status', label: 'Status' },
            ];
            exportToPDF(customerBilling, columns, 'Customer Billing Report', 'Customer_Billing_Report', [139, 92, 246]);
        }
    };

    const handleTabKeyDown = (e, index) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = (index + 1) % TABS.length;
            setActiveTab(TABS[next].key);
            setTimeout(() => {
                document.getElementById(`tab-${TABS[next].key}`)?.focus();
            }, 0);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = (index - 1 + TABS.length) % TABS.length;
            setActiveTab(TABS[prev].key);
            setTimeout(() => {
                document.getElementById(`tab-${TABS[prev].key}`)?.focus();
            }, 0);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-10 lg:pl-4">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    {/* P6: h1 */}
                    <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3 text-balance">
                        <Layers className="text-emerald-700 dark:text-emerald-400 opacity-90" size={32} aria-hidden="true" /> Ledger &amp; Reports
                    </h1>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 text-pretty">
                        Comprehensive audit trails of your completed transactions.
                    </p>
                    {error && <p className="text-sm text-red-700 dark:text-red-400 mt-2" role="alert">{error}</p>}
                    {loading && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Loading reports…</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="btn-secondary flex items-center gap-2 border-[rgb(var(--border-subtle))] bg-white/80 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 hover:border-emerald-300 dark:hover:border-emerald-700 backdrop-blur-md min-h-[42px] px-4 rounded-xl text-sm font-semibold active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400"
                    >
                        <FileSpreadsheet size={17} aria-hidden="true" /> Export Excel
                    </button>
                    <button
                        type="button"
                        onClick={handleExportPDF}
                        className="btn-secondary flex items-center gap-2 border-[rgb(var(--border-subtle))] bg-white/80 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-900 dark:text-red-200 hover:border-red-300 dark:hover:border-red-700 backdrop-blur-md min-h-[42px] px-4 rounded-xl text-sm font-semibold active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:focus-visible:ring-red-400"
                    >
                        <Download size={17} aria-hidden="true" /> Export PDF
                    </button>
                </div>
            </div>

            {/* ── Tab Selector – WAI-ARIA tablist ── */}
            <div
                className="card-glass w-full border-white/20 dark:border-white/5 p-2 shadow-xl animate-slide-up overflow-x-auto no-scrollbar"
                style={{ animationDelay: '100ms' }}
            >
                <div className="flex gap-1 min-w-max sm:min-w-0" role="tablist" aria-label="Report type tabs">
                    {TABS.map((tab, i) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                id={`tab-${tab.key}`}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`tabpanel-${tab.key}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => setActiveTab(tab.key)}
                                onKeyDown={(e) => handleTabKeyDown(e, i)}
                                className={`flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-colors duration-200 border whitespace-nowrap active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
                                    ${isActive
                                        ? tab.activeClass
                                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                    }`}
                            >
                                <Icon size={16} aria-hidden="true" />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ml-0.5 uppercase tracking-wider ${tab.badgeClass}`}
                                        aria-hidden="true"
                                    >
                                        Active
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Report Tables ── */}

            {/* Wholesale Purchase */}
            {activeTab === 'wholesale-purchase' && (
                <div
                    id="tabpanel-wholesale-purchase"
                    role="tabpanel"
                    aria-labelledby="tab-wholesale-purchase"
                    tabIndex={0}
                    className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl animate-slide-up focus:outline-none"
                    style={{ animationDelay: '150ms' }}
                >
                    <div className="p-6 border-b border-[rgb(var(--border-subtle))] bg-gradient-to-r from-emerald-600/10 dark:from-emerald-400/10 to-transparent">
                        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-balance">
                            <ShoppingCart size={20} className="text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                            Wholesale Purchase Report
                        </h2>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 text-pretty">Stock procured from suppliers &amp; distributors.</p>
                    </div>
                    <ScrollTable label="Wholesale purchase records">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-[rgb(var(--border-subtle))] text-xs uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200">
                                    <th scope="col" className="p-5">#</th>
                                    <th scope="col" className="p-5">Date</th>
                                    <th scope="col" className="p-5">Supplier Name</th>
                                    <th scope="col" className="p-5">Item Name</th>
                                    <th scope="col" className="p-5 text-center">Quantity</th>
                                    <th scope="col" className="p-5 text-right">Rate (₹)</th>
                                    <th scope="col" className="p-5 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {wholesalePurchases.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-slate-600 dark:text-slate-400 font-medium">
                                            {loading ? 'Loading…' : 'No wholesale purchase records.'}
                                        </td>
                                    </tr>
                                ) : wholesalePurchases.map((row) => (
                                    <tr key={row.id} className="bg-transparent hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                                        <td className="p-5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-400">{String(row.id).padStart(3,'0')}</td>
                                        <td className="p-5 text-slate-800 dark:text-slate-200 font-medium tabular-nums">{toDateLabel(row.date)}</td>
                                        <td className="p-5 font-bold text-slate-900 dark:text-white">{row.supplier}</td>
                                        <td className="p-5 text-slate-800 dark:text-slate-200">{row.item}</td>
                                        <td className="p-5 text-center font-mono text-sm tabular-nums text-slate-800 dark:text-slate-200">{row.qty}</td>
                                        <td className="p-5 text-right font-mono text-sm tabular-nums text-slate-800 dark:text-slate-200">₹{row.rate.toFixed(2)}</td>
                                        <td className="p-5 text-right">
                                            <span className={`font-display font-bold text-base tabular-nums px-3 py-1.5 rounded-lg ${TABS[0].amountPill}`}>
                                                ₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollTable>
                </div>
            )}

            {/* Wholesale Sale */}
            {activeTab === 'wholesale-sale' && (
                <div
                    id="tabpanel-wholesale-sale"
                    role="tabpanel"
                    aria-labelledby="tab-wholesale-sale"
                    tabIndex={0}
                    className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl animate-slide-up focus:outline-none"
                    style={{ animationDelay: '150ms' }}
                >
                    <div className="p-6 border-b border-[rgb(var(--border-subtle))] bg-gradient-to-r from-green-600/10 dark:from-green-400/10 to-transparent">
                        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-balance">
                            <TrendingUp size={20} className="text-green-700 dark:text-green-400" aria-hidden="true" />
                            Wholesale Sale Report
                        </h2>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 text-pretty">Stock sold in bulk to retail buyers &amp; pharmacies.</p>
                    </div>
                    <ScrollTable label="Wholesale sale records">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-[rgb(var(--border-subtle))] text-xs uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200">
                                    <th scope="col" className="p-5">#</th>
                                    <th scope="col" className="p-5">Date</th>
                                    <th scope="col" className="p-5">Buyer Name</th>
                                    <th scope="col" className="p-5">Item Name</th>
                                    <th scope="col" className="p-5 text-center">Quantity</th>
                                    <th scope="col" className="p-5 text-right">Rate (₹)</th>
                                    <th scope="col" className="p-5 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {wholesaleSales.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-slate-600 dark:text-slate-400 font-medium">
                                            {loading ? 'Loading…' : 'No wholesale sale records.'}
                                        </td>
                                    </tr>
                                ) : wholesaleSales.map((row) => (
                                    <tr key={row.id} className="bg-transparent transition-colors hover:bg-green-50/40 dark:hover:bg-green-950/20">
                                        <td className="p-5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-400">{String(row.id).padStart(3,'0')}</td>
                                        <td className="p-5 text-slate-800 dark:text-slate-200 font-medium tabular-nums">{toDateLabel(row.date)}</td>
                                        <td className="p-5 font-bold text-slate-900 dark:text-white">{row.buyer}</td>
                                        <td className="p-5 text-slate-800 dark:text-slate-200">{row.item}</td>
                                        <td className="p-5 text-center font-mono text-sm tabular-nums text-slate-800 dark:text-slate-200">{row.qty}</td>
                                        <td className="p-5 text-right font-mono text-sm tabular-nums text-slate-800 dark:text-slate-200">₹{row.rate.toFixed(2)}</td>
                                        <td className="p-5 text-right">
                                            <span className={`font-display font-bold text-base tabular-nums px-3 py-1.5 rounded-lg ${TABS[1].amountPill}`}>
                                                ₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollTable>
                </div>
            )}

            {/* Customer Billing */}
            {activeTab === 'customer-billing' && (
                <div
                    id="tabpanel-customer-billing"
                    role="tabpanel"
                    aria-labelledby="tab-customer-billing"
                    tabIndex={0}
                    className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl animate-slide-up focus:outline-none"
                    style={{ animationDelay: '150ms' }}
                >
                    <div className="p-6 border-b border-[rgb(var(--border-subtle))] bg-gradient-to-r from-purple-600/10 dark:from-purple-400/10 to-transparent">
                        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 text-balance">
                            <Receipt size={20} className="text-purple-700 dark:text-purple-400" aria-hidden="true" />
                            Customer Billing Report
                        </h2>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 text-pretty">Direct retail invoices raised for individual customers.</p>
                    </div>
                    <ScrollTable label="Customer billing records">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-[rgb(var(--border-subtle))] text-xs uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200">
                                    <th scope="col" className="p-5">#</th>
                                    <th scope="col" className="p-5">Date</th>
                                    <th scope="col" className="p-5">Customer Name</th>
                                    <th scope="col" className="p-5">Invoice No.</th>
                                    <th scope="col" className="p-5">Items</th>
                                    <th scope="col" className="p-5 text-right">Total Amount</th>
                                    <th scope="col" className="p-5 text-center">Payment Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {customerBilling.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-slate-600 dark:text-slate-400 font-medium">
                                            {loading ? 'Loading…' : 'No customer billing records.'}
                                        </td>
                                    </tr>
                                ) : customerBilling.map((row) => (
                                    <tr key={row.id} className="bg-transparent transition-colors hover:bg-purple-50/40 dark:hover:bg-purple-950/20">
                                        <td className="p-5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-400">{String(row.id).padStart(3,'0')}</td>
                                        <td className="p-5 text-slate-800 dark:text-slate-200 font-medium tabular-nums">{toDateLabel(row.date)}</td>
                                        <td className="p-5 font-bold text-slate-900 dark:text-white">{row.customer}</td>
                                        <td className="p-5 font-mono text-sm tabular-nums text-purple-900 dark:text-purple-300 font-semibold">{row.invoice}</td>
                                        <td className="p-5 text-slate-700 dark:text-slate-300 text-sm max-w-xs truncate">{row.items}</td>
                                        <td className="p-5 text-right">
                                            <span className={`font-display font-bold text-base tabular-nums px-3 py-1.5 rounded-lg ${TABS[2].amountPill}`}>
                                                ₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <StatusBadge status={row.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollTable>
                </div>
            )}

        </div>
    );
};

export default Reports;
