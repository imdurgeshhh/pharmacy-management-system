import React from 'react';
import { LogOut, User, Menu, Moon, Sun, Bell } from 'lucide-react';
import useStore from '../store/useStore';
import { useNavigate } from 'react-router-dom';

const Header = ({ toggleSidebar }) => {
    const user = useStore(state => state.user);
    const logout = useStore(state => state.logout);
    const isEmployee = useStore(state => state.isEmployee);
    const navigate = useNavigate();

    // Quick dark mode toggle logic
    const [darkMode, setDarkMode] = React.useState(
        document.documentElement.classList.contains('dark')
    );

    const toggleDark = () => {
        document.documentElement.classList.toggle('dark');
        setDarkMode(!darkMode);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="h-20 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 border-b border-[rgb(var(--border-subtle))] bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 transition-colors duration-400">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 rounded-xl bg-[rgb(var(--color-primary))]/5 hover:bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--text-heading))] transition-colors"
                >
                    <Menu size={20} />
                </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">

                {/* Notifications Bell */}
                <button
                    className="p-2.5 rounded-full hover:bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--text-body))] hover:text-[rgb(var(--color-primary))] transition-all active:scale-90 relative"
                    title="Notifications"
                >
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleDark}
                    className="p-2.5 rounded-full hover:bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--text-body))] hover:text-[rgb(var(--color-primary))] transition-all active:scale-90"
                    title="Toggle Theme"
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="h-8 w-px bg-[rgb(var(--border-subtle))] hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-sm font-bold font-sans text-[rgb(var(--text-heading))] tracking-tight">{user?.name || 'User'}</span>
                        {/* Show Employee ID badge for employees, role for admins */}
                        {isEmployee() && user?.employee_id ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 tracking-wide">
                                {user.employee_id}
                            </span>
                        ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-bold tracking-wide uppercase">
                                {user?.role || 'Staff'}
                            </span>
                        )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-light))] flex items-center justify-center text-white shadow-lg shadow-[rgb(var(--color-primary))]/20">
                        <User size={18} />
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="ml-2 p-2.5 text-[rgb(var(--text-body))] hover:text-red-500 bg-red-500/0 hover:bg-red-500/10 transition-all rounded-full"
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

export default Header;
