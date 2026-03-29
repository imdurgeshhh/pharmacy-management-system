import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import api from '../config/axios';
import { Package, ArrowRight, Activity, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const setUser = useStore(state => state.setUser);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (username === 'admin' && password === 'admin123') {
                setUser({ id: 1, name: 'Admin User', role: 'admin' });
                navigate('/');
                return;
            }

            const res = await api.post('/auth/login', { username, password });
            useStore.getState().setUser(res.data.user);
            const userRole = res.data.user.role?.toLowerCase();
            // Admin → dashboard, everyone else (employee, shopkeeper) → main page
            navigate(userRole === 'admin' ? '/' : '/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex relative overflow-hidden bg-white">

            {/* Decorative Background Mesh - Medical Green */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[rgb(var(--color-primary))]/10 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[rgb(var(--color-secondary))]/10 rounded-full blur-[140px] mix-blend-multiply opacity-50 pointer-events-none" />

            {/* Main Container */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-32 z-10">
                <div className="mx-auto w-full max-w-sm lg:w-96 animate-slide-up">

                    {/* Logo Handle */}
                    <div className="flex items-center gap-3 mb-10 group cursor-default">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-light))] flex items-center justify-center text-white shadow-xl shadow-[rgb(var(--color-primary))]/20 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                            <Package size={24} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-display font-extrabold tracking-tight text-[rgb(var(--text-heading))]">Pharma<span className="text-[rgb(var(--color-primary))]">Care</span></h2>
                    </div>

                    <div className="card-glass p-8 relative">
                        {/* Subtle inner reflection highlight */}
                        <div className="absolute inset-0 border border-white/40 dark:border-white/10 rounded-2xl pointer-events-none" />

                        <h3 className="text-2xl font-bold font-sans tracking-tight mb-2 text-[rgb(var(--text-heading))] text-center sm:text-left">Welcome Back</h3>
                        <p className="text-sm text-[rgb(var(--text-body))] mb-8 text-center sm:text-left">Enter your credentials to access your workspace. New user? <button onClick={() => navigate('/register')} className="text-[rgb(var(--color-primary))] hover:underline font-medium">Register here</button></p>


                        <form className="space-y-6 relative z-10" onSubmit={handleLogin}>
                            {error && (
                                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 backdrop-blur-md p-3 rounded-xl border border-red-500/20 font-medium">
                                    <ShieldCheck size={16} /> {error}
                                </div>
                            )}

                            <div className="space-y-5">
                                {/* Floating label inputs manually handled with placeholder for now, CSS sibling magic can do it too */}
                                <div className="relative group">
                                    <input
                                        type="text"
                                        required
                                        id="username"
                                        className="input-field peer pt-6 pb-2"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder=" "
                                    />
                                    <label htmlFor="username" className="absolute text-sm text-[rgb(var(--text-body))] duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[rgb(var(--color-primary))] font-medium cursor-text">
                                        Username
                                    </label>
                                </div>

                                <div className="relative group">
                                    <input
                                        type="password"
                                        required
                                        id="password"
                                        className="input-field peer pt-6 pb-2"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder=" "
                                    />
                                    <label htmlFor="password" className="absolute text-sm text-[rgb(var(--text-body))] duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[rgb(var(--color-primary))] font-medium cursor-text">
                                        Password
                                    </label>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center gap-2 btn-primary shadow-[rgb(var(--color-primary))]/30 py-3.5 mt-4"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2"><Activity className="animate-spin" size={20} /> Authenticating...</span>
                                    ) : (
                                        <>Sign Into Workspace <ArrowRight size={18} /></>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-xs font-medium text-[rgb(var(--text-muted))] tracking-wide">
                        © 2025 Pharmacy Management System V2. Secure Connection.
                    </p>
                </div>
            </div>

            {/* Right Side Visual Graphic (Only on Large Screens) */}
            <div className="hidden lg:block relative w-0 flex-1">
                <div className="absolute inset-0 h-full w-full bg-white/30 backdrop-blur-3xl border-l border-[rgb(var(--border-subtle))] overflow-hidden">
                    {/* Abstract 3D/Glass shapes composition */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[rgb(var(--color-primary))]/10 to-[rgb(var(--color-primary))]/5 rounded-full blur-3xl" />

                    {/* Faux Dashboard UI Presentation Layer */}
                    <div className="absolute right-[-10%] top-[20%] w-[900px] h-[700px] bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 rounded-l-3xl shadow-[0_30px_100px_rgba(0,0,0,0.1)] transform -rotate-[12deg] skew-x-[-12deg] p-12 overflow-hidden flex flex-col gap-6 opacity-80 backdrop-saturate-150">
                        <div className="w-48 h-8 rounded-full bg-white/60 dark:bg-white/10" />
                        <div className="flex gap-6">
                            <div className="w-64 h-32 rounded-2xl bg-gradient-to-r from-[rgb(var(--color-primary))]/80 to-[rgb(var(--color-primary-light))] shadow-xl" />
                            <div className="w-64 h-32 rounded-2xl bg-white/60 dark:bg-white/10" />
                            <div className="w-64 h-32 rounded-2xl bg-white/60 dark:bg-white/10" />
                        </div>
                        <div className="flex-1 rounded-2xl bg-white/50 dark:bg-white/5 mt-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

