import React, { useState, useEffect } from 'react';
import api from '../config/axios';
import { format } from 'date-fns';
import { Download, Layers, ShoppingCart, TrendingUp, Receipt } from 'lucide-react';

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_WHOLESALE_PURCHASE = [
    { id: 1, date: '2026-03-12', supplier: 'Global Pharma Ltd.', item: 'Paracetamol 500mg', qty: 200, rate: 12.5, total: 2500 },
    { id: 2, date: '2026-03-11', supplier: 'MedLife Wholesale', item: 'Amoxicillin 250mg', qty: 150, rate: 28.0, total: 4200 },
    { id: 3, date: '2026-03-10', supplier: 'SunPharma Depot', item: 'Cetirizine 10mg', qty: 500, rate: 5.5, total: 2750 },
    { id: 4, date: '2026-03-09', supplier: 'Cipla Distributors', item: 'Omeprazole 20mg', qty: 300, rate: 18.0, total: 5400 },
    { id: 5, date: '2026-03-08', supplier: 'Global Pharma Ltd.', item: 'Aspirin 75mg', qty: 400, rate: 8.25, total: 3300 },
];

const MOCK_WHOLESALE_SALE = [
    { id: 1, date: '2026-03-13', buyer: 'City Medical Store', item: 'Paracetamol 500mg', qty: 100, rate: 15.0, total: 1500 },
    { id: 2, date: '2026-03-12', buyer: 'Sunrise Pharmacy', item: 'Amoxicillin 250mg', qty: 80, rate: 35.0, total: 2800 },
    { id: 3, date: '2026-03-11', buyer: 'HealthPlus Retail', item: 'Omeprazole 20mg', qty: 120, rate: 22.0, total: 2640 },
    { id: 4, date: '2026-03-10', buyer: 'Apollo Pharmacy', item: 'Cetirizine 10mg', qty: 200, rate: 7.5, total: 1500 },
    { id: 5, date: '2026-03-09', buyer: 'City Medical Store', item: 'Aspirin 75mg', qty: 180, rate: 11.0, total: 1980 },
];

const MOCK_CUSTOMER_BILLING = [
    { id: 1, date: '2026-03-14', customer: 'Rahul Sharma', invoice: 'INV-1041', items: 'Paracetamol, Vitamin C', total: 345.00, status: 'Paid' },
    { id: 2, date: '2026-03-14', customer: 'Priya Mehta', invoice: 'INV-1042', items: 'Amoxicillin, Cough Syrup', total: 780.00, status: 'Pending' },
    { id: 3, date: '2026-03-13', customer: 'Walk-in', invoice: 'INV-1043', items: 'Cetirizine, Eye Drops', total: 130.00, status: 'Paid' },
    { id: 4, date: '2026-03-12', customer: 'Anil Kumar', invoice: 'INV-1044', items: 'Metformin, BP Tablets', total: 920.00, status: 'Paid' },
    { id: 5, date: '2026-03-11', customer: 'Sunita Devi', invoice: 'INV-1045', items: 'Omeprazole, Antacid', total: 460.00, status: 'Overdue' },
];

// ── Tab Config ───────────────────────────────────────────────────────────────
const TABS = [
    { key: 'wholesale-purchase', label: 'Wholesale Purchase', icon: ShoppingCart, color: 'var(--color-secondary)' },
    { key: 'wholesale-sale',     label: 'Wholesale Sale',     icon: TrendingUp,   color: 'var(--color-primary)'   },
    { key: 'customer-billing',   label: 'Customer Billing',   icon: Receipt,      color: '139, 92, 246'           },
];

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const styles = {
        Paid:    { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
        Pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
        Overdue: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
    };
    const s = styles[status] || styles.Pending;
    return (
        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
              className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {status}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Reports = () => {
    const [activeTab, setActiveTab] = useState('wholesale-purchase');
    const [salesRaw, setSalesRaw] = useState([]);
    const [purchasesRaw, setPurchasesRaw] = useState([]);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const [salesRes, purchasesRes] = await Promise.all([
                    api.get('/sales').catch(() => ({
                        data: [
                            { id: 1001, customer_name: 'John Doe', total_amount: 540.00, tax_amount: 64.80, created_at: new Date().toISOString() },
                            { id: 1002, customer_name: 'Walk-in', total_amount: 120.00, tax_amount: 14.40, created_at: new Date().toISOString() },
                        ]
                    })),
                    api.get('/purchases').catch(() => ({
                        data: [
                            { id: 2001, supplier_name: 'Global Pharma', total_amount: 4500.00, tax_amount: 540.00, created_at: new Date(Date.now() - 43200000).toISOString() },
                            { id: 2002, supplier_name: 'MedLife Whole', total_amount: 12000.00, tax_amount: 1440.00, created_at: new Date(Date.now() - 172800000).toISOString() },
                        ]
                    }))
                ]);
                setSalesRaw(salesRes.data);
                setPurchasesRaw(purchasesRes.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchReports();
    }, []);

    const activeTabConfig = TABS.find(t => t.key === activeTab);
    const accentColor = `rgb(${activeTabConfig?.color})`;

    return (
        <div className="space-y-6 animate-fade-in relative z-10 lg:pl-4">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="h2-fluid tracking-tight text-[rgb(var(--text-heading))] flex items-center gap-3">
                        <Layers className="text-[rgb(var(--color-secondary))] opacity-80" size={32} /> Ledger &amp; Reports
                    </h1>
                    <p className="text-sm font-medium text-[rgb(var(--text-body))] mt-1">
                        Comprehensive audit trails of your completed transactions.
                    </p>
                </div>
                <button className="btn-secondary flex items-center gap-2 border-[rgb(var(--border-subtle))] bg-white/50 hover:bg-[rgb(var(--color-primary))]/5 backdrop-blur-md">
                    <Download size={18} /> Export Records CSV
                </button>
            </div>

            {/* ── Tab Selector ── */}
            <div className="card-glass w-full border-white/20 dark:border-white/5 p-2 shadow-xl animate-slide-up overflow-x-auto no-scrollbar" style={{ animationDelay: '100ms' }}>
                <div className="flex gap-1 min-w-max sm:min-w-0">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={isActive ? {
                                    background: `rgba(${tab.color}, 0.12)`,
                                    color: `rgb(${tab.color})`,
                                    borderColor: `rgba(${tab.color}, 0.35)`,
                                    boxShadow: `0 0 0 1px rgba(${tab.color}, 0.15) inset`,
                                } : {}}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border whitespace-nowrap
                                    ${isActive
                                        ? 'border-transparent'
                                        : 'border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-body))] hover:bg-white/20'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                                {isActive && (
                                    <span style={{ background: `rgba(${tab.color}, 0.2)`, color: `rgb(${tab.color})` }}
                                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-0.5">
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
                <div className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="p-6 border-b border-[rgb(var(--border-subtle))]" style={{ background: `linear-gradient(to right, rgba(${TABS[0].color}, 0.07), transparent)` }}>
                        <h2 className="text-xl font-display font-bold text-[rgb(var(--text-heading))] flex items-center gap-2">
                            <ShoppingCart size={20} style={{ color: `rgb(${TABS[0].color})` }} />
                            Wholesale Purchase Report
                        </h2>
                        <p className="text-sm text-[rgb(var(--text-muted))] mt-1">Stock procured from suppliers &amp; distributors.</p>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/30 border-b border-[rgb(var(--border-subtle))] text-xs uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                                    <th className="p-5">#</th>
                                    <th className="p-5">Date</th>
                                    <th className="p-5">Supplier Name</th>
                                    <th className="p-5">Item Name</th>
                                    <th className="p-5 text-center">Quantity</th>
                                    <th className="p-5 text-right">Rate (₹)</th>
                                    <th className="p-5 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {MOCK_WHOLESALE_PURCHASE.map((row) => (
                                    <tr key={row.id} style={{'--hover-color': `rgba(${TABS[0].color}, 0.05)`}} className="bg-transparent hover:bg-[--hover-color] transition-colors group">
                                        <td className="p-5 font-mono text-xs text-[rgb(var(--text-muted))]">{String(row.id).padStart(3,'0')}</td>
                                        <td className="p-5 text-[rgb(var(--text-body))] font-medium">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                                        <td className="p-5 font-bold text-[rgb(var(--text-heading))]">{row.supplier}</td>
                                        <td className="p-5 text-[rgb(var(--text-body))]">{row.item}</td>
                                        <td className="p-5 text-center font-mono text-sm text-[rgb(var(--text-body))]">{row.qty}</td>
                                        <td className="p-5 text-right font-mono text-sm text-[rgb(var(--text-body))]">₹{row.rate.toFixed(2)}</td>
                                        <td className="p-5 text-right">
                                            <span style={{ color: `rgb(${TABS[0].color})`, background: `rgba(${TABS[0].color},0.10)`, border: `1px solid rgba(${TABS[0].color},0.2)` }}
                                                  className="font-display font-bold text-base px-3 py-1.5 rounded-lg">
                                                ₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Wholesale Sale */}
            {activeTab === 'wholesale-sale' && (
                <div className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="p-6 border-b border-[rgb(var(--border-subtle))]" style={{ background: `linear-gradient(to right, rgba(${TABS[1].color}, 0.07), transparent)` }}>
                        <h2 className="text-xl font-display font-bold text-[rgb(var(--text-heading))] flex items-center gap-2">
                            <TrendingUp size={20} style={{ color: `rgb(${TABS[1].color})` }} />
                            Wholesale Sale Report
                        </h2>
                        <p className="text-sm text-[rgb(var(--text-muted))] mt-1">Stock sold in bulk to retail buyers &amp; pharmacies.</p>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/30 border-b border-[rgb(var(--border-subtle))] text-xs uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                                    <th className="p-5">#</th>
                                    <th className="p-5">Date</th>
                                    <th className="p-5">Buyer Name</th>
                                    <th className="p-5">Item Name</th>
                                    <th className="p-5 text-center">Quantity</th>
                                    <th className="p-5 text-right">Rate (₹)</th>
                                    <th className="p-5 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {MOCK_WHOLESALE_SALE.map((row) => (
                                    <tr key={row.id} className="bg-transparent transition-colors group" style={{'--hover-color': `rgba(${TABS[1].color}, 0.05)`}}
                                        onMouseEnter={e => e.currentTarget.style.background=`rgba(${TABS[1].color},0.05)`}
                                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                        <td className="p-5 font-mono text-xs text-[rgb(var(--text-muted))]">{String(row.id).padStart(3,'0')}</td>
                                        <td className="p-5 text-[rgb(var(--text-body))] font-medium">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                                        <td className="p-5 font-bold text-[rgb(var(--text-heading))]">{row.buyer}</td>
                                        <td className="p-5 text-[rgb(var(--text-body))]">{row.item}</td>
                                        <td className="p-5 text-center font-mono text-sm text-[rgb(var(--text-body))]">{row.qty}</td>
                                        <td className="p-5 text-right font-mono text-sm text-[rgb(var(--text-body))]">₹{row.rate.toFixed(2)}</td>
                                        <td className="p-5 text-right">
                                            <span style={{ color: `rgb(${TABS[1].color})`, background: `rgba(${TABS[1].color},0.10)`, border: `1px solid rgba(${TABS[1].color},0.2)` }}
                                                  className="font-display font-bold text-base px-3 py-1.5 rounded-lg">
                                                ₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Customer Billing */}
            {activeTab === 'customer-billing' && (
                <div className="card-glass w-full border-white/20 dark:border-white/5 p-0 overflow-hidden shadow-2xl animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="p-6 border-b border-[rgb(var(--border-subtle))]" style={{ background: `linear-gradient(to right, rgba(${TABS[2].color}, 0.07), transparent)` }}>
                        <h2 className="text-xl font-display font-bold text-[rgb(var(--text-heading))] flex items-center gap-2">
                            <Receipt size={20} style={{ color: `rgb(${TABS[2].color})` }} />
                            Customer Billing Report
                        </h2>
                        <p className="text-sm text-[rgb(var(--text-muted))] mt-1">Direct retail invoices raised for individual customers.</p>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/30 border-b border-[rgb(var(--border-subtle))] text-xs uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                                    <th className="p-5">#</th>
                                    <th className="p-5">Date</th>
                                    <th className="p-5">Customer Name</th>
                                    <th className="p-5">Invoice No.</th>
                                    <th className="p-5">Items</th>
                                    <th className="p-5 text-right">Total Amount</th>
                                    <th className="p-5 text-center">Payment Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {MOCK_CUSTOMER_BILLING.map((row) => (
                                    <tr key={row.id} className="bg-transparent transition-colors"
                                        onMouseEnter={e => e.currentTarget.style.background=`rgba(${TABS[2].color},0.05)`}
                                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                        <td className="p-5 font-mono text-xs text-[rgb(var(--text-muted))]">{String(row.id).padStart(3,'0')}</td>
                                        <td className="p-5 text-[rgb(var(--text-body))] font-medium">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                                        <td className="p-5 font-bold text-[rgb(var(--text-heading))]">{row.customer}</td>
                                        <td className="p-5 font-mono text-sm" style={{ color: `rgb(${TABS[2].color})` }}>{row.invoice}</td>
                                        <td className="p-5 text-[rgb(var(--text-muted))] text-sm max-w-xs truncate">{row.items}</td>
                                        <td className="p-5 text-right">
                                            <span style={{ color: `rgb(${TABS[2].color})`, background: `rgba(${TABS[2].color},0.10)`, border: `1px solid rgba(${TABS[2].color},0.2)` }}
                                                  className="font-display font-bold text-base px-3 py-1.5 rounded-lg">
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
                    </div>
                </div>
            )}

        </div>
    );
};

export default Reports;

