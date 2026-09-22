import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { LayoutDashboard, ShoppingCart, Package, Truck, FileBarChart, X, Users, UserCheck } from 'lucide-react';
import { APP_BRAND } from '../config/shop';


const Sidebar = ({ isOpen = false, setIsOpen = () => {} }) => {
    const location = useLocation();
    const isAdmin = useStore(state => state.isAdmin);

    // Close sidebar on route change on mobile
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Close sidebar on Escape key when mobile drawer is open
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setIsOpen]);

    const baseMenuItems = [
        { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} aria-hidden="true" /> },
        { path: '/pos', name: 'Billing / POS', icon: <ShoppingCart size={20} aria-hidden="true" /> },
        { path: '/inventory', name: 'Inventory', icon: <Package size={20} aria-hidden="true" /> },
        { path: '/purchases', name: 'Purchases', icon: <Truck size={20} aria-hidden="true" /> },
        { path: '/suppliers', name: 'Suppliers', icon: <Users size={20} aria-hidden="true" /> },
    ];

    const adminOnlyItems = [
        { path: '/reports', name: 'Reports', icon: <FileBarChart size={20} aria-hidden="true" /> },
        { path: '/employees', name: 'Employees', icon: <UserCheck size={20} aria-hidden="true" /> },
    ];

    const menuItems = [
        ...baseMenuItems,
        ...(isAdmin() ? adminOnlyItems : [])
    ];


    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar drawer */}
            {/* P3: aside landmark for secondary navigation */}
            <aside
                aria-label="Application sidebar"
                className={`
                fixed top-0 left-0 bottom-0 z-50 w-72 bg-gradient-to-b from-[#F5F9F6] to-[#E8F5E9] backdrop-blur-2xl border-r border-[rgb(var(--border-subtle))] shadow-2xl 
                flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) text-[rgb(var(--text-heading))]
                md:translate-x-0 md:static md:w-64 md:shadow-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>

                {/* Header Profile Area */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-[rgb(var(--color-primary))]/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary))]/10 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-light))] flex items-center justify-center text-white shadow-lg shadow-[rgb(var(--color-primary))]/30">
                            <Package size={20} strokeWidth={2.5} aria-hidden="true" />
                        </div>
                        <span className="font-display font-bold text-xl tracking-tight text-[rgb(var(--color-primary))]">{APP_BRAND}</span>
                    </div>
                    {/* P2: aria-label on icon-only close button; P7: min 44px touch target */}
                    <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Close sidebar"
                        className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--text-body))] transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] relative z-10"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* P3: nav with aria-label to distinguish from any breadcrumb nav */}
                <nav aria-label="Main navigation" className="flex-1 py-6 px-4 overflow-y-auto no-scrollbar">
                    {/* Semantic heading for navigation section */}
                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 px-2">Menu Functions</h2>
                    <ul className="space-y-2" role="list">
                        {menuItems.map((item, i) => (
                            <li key={item.path} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                                <NavLink
                                    to={item.path}
                                    end={item.path === '/'}
                                    aria-label={item.name}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-[color,background-color,box-shadow,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1 relative overflow-hidden group ${isActive
                                            ? 'text-white shadow-lg shadow-emerald-900/25'
                                            : 'text-[rgb(var(--text-body))] hover:bg-[rgb(var(--color-primary))]/5 hover:text-[rgb(var(--color-primary))]'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            {/* Active background glow with high contrast >= 5.5:1 against white text */}
                                            {isActive && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 to-emerald-700 opacity-100 transition-opacity" />
                                            )}

                                            <div className="relative z-10 transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                                                {item.icon}
                                            </div>
                                            <span className="relative z-10 font-sans tracking-wide">{item.name}</span>
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer - Medical Tagline */}
                <div className="p-4 border-t border-[rgb(var(--color-primary))]/10">
                    <div className="p-3 rounded-xl bg-[rgb(var(--color-primary))]/5 border border-[rgb(var(--color-primary))]/10">
                        {/* High contrast text */}
                        <p className="text-xs font-semibold text-slate-700 text-center">
                            🏥 Your Trusted<br/>Pharmacy Partner
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
