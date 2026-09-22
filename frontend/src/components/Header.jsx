import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Menu, Moon, Sun, Bell, Building2, ChevronDown } from 'lucide-react';
import useStore from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import StoreSettingsModal from './StoreSettingsModal';

const Header = ({ toggleSidebar }) => {
    const user = useStore(state => state.user);
    const logout = useStore(state => state.logout);
    const navigate = useNavigate();
    const { signOut } = useClerk();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Quick dark mode toggle logic
    const [darkMode, setDarkMode] = React.useState(
        document.documentElement.classList.contains('dark')
    );

    const toggleDark = () => {
        document.documentElement.classList.toggle('dark');
        setDarkMode(!darkMode);
    };

    // Close profile dropdown on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isMenuOpen]);

    const handleLogout = async () => {
        setIsMenuOpen(false);
        logout();
        navigate('/login');
        try {
            await signOut?.({ redirectUrl: '/login' });
        } catch (err) {
            console.error('Clerk signOut error:', err);
        }
    };

    const handleOpenStoreSettings = () => {
        setIsMenuOpen(false);
        setIsStoreModalOpen(true);
    };

    const isAdmin = user?.role?.toLowerCase() === 'admin';

    return (
        <>
            <header className="h-20 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 border-b border-[rgb(var(--border-subtle))] bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 transition-[background-color,border-color] duration-300">
                <div className="flex items-center gap-4">
                    {/* P7: min-h/w 44px for touch target */}
                    <button
                        onClick={toggleSidebar}
                        aria-label="Open sidebar menu"
                        className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[rgb(var(--color-primary))]/5 hover:bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--text-heading))] transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] active:scale-[0.96]"
                    >
                        <Menu size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-6">
                    {/* Notifications Bell */}
                    <button
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--text-body))] hover:text-[rgb(var(--color-primary))] transition-[color,background-color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] relative"
                        aria-label="View notifications"
                    >
                        <Bell size={20} aria-hidden="true" />
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleDark}
                        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--text-body))] hover:text-[rgb(var(--color-primary))] transition-[color,background-color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
                    >
                        {darkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                    </button>

                    <div className="h-8 w-px bg-[rgb(var(--border-subtle))] hidden sm:block"></div>

                    {/* Profile Dropdown Container */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            aria-expanded={isMenuOpen}
                            aria-haspopup="menu"
                            aria-label="User profile menu"
                            className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]"
                        >
                            <div className="hidden sm:flex flex-col items-end gap-1 text-right">
                                <span className="text-sm font-bold font-sans text-[rgb(var(--text-heading))] tracking-tight text-balance">
                                    {user?.name || 'User'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold tracking-wide uppercase">
                                        {user?.role || 'Staff'}
                                    </span>
                                    {(user?.employee_id || user?.id) && (
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums tracking-wide">
                                            {user?.employee_id || `#${String(user.id).padStart(3, '0')}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-light))] flex items-center justify-center text-white shadow-lg shadow-[rgb(var(--color-primary))]/20">
                                <User size={18} aria-hidden="true" />
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div
                                role="menu"
                                aria-label="Profile actions"
                                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-fade-in"
                            >
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {user?.name || 'User'}
                                    </p>
                                    {user?.email && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {user.email}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold uppercase tracking-wider">
                                            {user?.role || 'Staff'}
                                        </span>
                                        {(user?.employee_id || user?.id) && (
                                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                {user?.employee_id || `#${String(user.id).padStart(3, '0')}`}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="py-1">
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={handleOpenStoreSettings}
                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                                        >
                                            <Building2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>Store Details / Pharmacy Profile</span>
                                        </button>
                                    </div>
                                )}

                                <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                                <div className="py-1">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={handleLogout}
                                        className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:bg-red-50"
                                    >
                                        <LogOut size={18} className="shrink-0" />
                                        <span>Log Out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Direct Logout Button */}
                    <button
                        onClick={handleLogout}
                        aria-label="Log out"
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[rgb(var(--text-body))] hover:text-red-500 bg-red-500/0 hover:bg-red-500/10 transition-[color,background-color,transform] duration-200 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.96]"
                    >
                        <LogOut size={20} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {/* Store Settings Modal for Admin */}
            {isAdmin && (
                <StoreSettingsModal
                    isOpen={isStoreModalOpen}
                    onClose={() => setIsStoreModalOpen(false)}
                />
            )}
        </>
    );
};

export default Header;
