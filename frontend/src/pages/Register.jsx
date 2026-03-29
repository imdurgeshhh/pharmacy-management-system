import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import api from '../config/axios';
import { Package, ArrowRight, Activity, ShieldCheck, UserPlus } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        username: '',
        password: '',
        confirm_password: ''
    });
    const [selectedRole, setSelectedRole] = useState('Shopkeeper');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/register', { ...formData, role: selectedRole });
            useStore.getState().setUser(res.data.user);
            alert(res.data.message || 'Registration successful! Logging in...');
            navigate('/shop/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden bg-white">
            {/* Backgrounds */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[rgb(var(--color-primary))]/10 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[rgb(var(--color-secondary))]/10 rounded-full blur-[140px] mix-blend-multiply opacity-50 pointer-events-none" />

            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-32 z-10">
                <div className="mx-auto w-full max-w-sm lg:w-96 animate-slide-up">
                    <div className="flex items-center gap-3 mb-10 group cursor-default">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary-light))] flex items-center justify-center text-white shadow-xl shadow-[rgb(var(--color-primary))]/20 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                            <UserPlus size={24} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-display font-extrabold tracking-tight text-[rgb(var(--text-heading))]">Pharma<span className="text-[rgb(var(--color-primary))]">Care</span></h2>
                    </div>

                    <div className="card-glass p-8 relative">
                        <div className="absolute inset-0 border border-white/40 dark:border-white/10 rounded-2xl pointer-events-none" />

                        <h3 className="text-2xl font-bold font-sans tracking-tight mb-2 text-[rgb(var(--text-heading))] text-center sm:text-left">Create Account</h3>
                        <p className="text-sm text-[rgb(var(--text-body))] mb-8 text-center sm:text-left">Join our pharmacy management system as Admin or Shopkeeper.</p>

                        <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
                            {error && (
                                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 backdrop-blur-md p-3 rounded-xl border border-red-500/20 font-medium">
                                    <ShieldCheck size={16} /> {error}
                                </div>
                            )}

                            <div className="space-y-5">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="full_name"
                                        required
                                        className="input-field peer pt-6 pb-2"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder=" "
                                    />
                                    <label className="absolute text-sm text-[rgb(var(--text-body))] duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[rgb(var(--color-primary))] font-medium cursor-text">
                                        Full Name
                                    </label>
                                </div>

                                <div className="relative group">
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        className="input-field peer pt-6 pb-2"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder=" "
                                    />
                                    <label className="absolute text-sm text-[rgb(var(--text-body))] duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[rgb(var(--color-primary))] font-medium cursor-text">
                                        Email
                                    </label>
                                </div>

                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="username"
                                        required
                                        className="input-field peer pt-6 pb-2"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder=" "
                                    />
                                    <label className="absolute text-sm text-[rgb(var(--text-body))] duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[rgb(var(--color-primary))] font-medium cursor-text">
                                        Username
                                    </label>
                                </div>

                                <div className="relative group">
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        className="input-field peer pt-6 pb-2"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder=" "
                                    />
                                    <label className="absolute text-sm text-[rgb(var(--text-body))] duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[rgb(var(--color-primary))] font-medium cursor-text">
                                        Password
                                    </label>
                                </div>

                                <div className="relative group">
                                    <input
                                        type="password"
                                        name="confirm_password"
                                        required
                                        className="input-field peer pt-6 pb-2"
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        placeholder=" "
                                    />
                                    <label className="absolute text-sm text-[rgb(var(--text-body))] duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[rgb(var(--color-primary))] font-medium cursor-text">
                                        Confirm Password
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">Role</label>
                                    <div className="flex gap-3 p-1 bg-white/50 rounded-xl border border-[rgb(var(--border-subtle))]/50">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole('Admin')}
                                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${selectedRole === 'Admin' ? 'bg-[rgb(var(--color-primary))] text-white shadow-lg shadow-[rgb(var(--color-primary))]/25' : 'text-[rgb(var(--text-body))]'}`}
                                        >
                                            Admin
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole('Shopkeeper')}
                                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${selectedRole === 'Shopkeeper' ? 'bg-[rgb(var(--color-primary))] text-white shadow-lg shadow-[rgb(var(--color-primary))]/25' : 'text-[rgb(var(--text-body))]'}`}
                                        >
                                            Shopkeeper
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center gap-2 btn-primary shadow-[rgb(var(--color-primary))]/30 py-3.5 mt-4"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2"><Activity className="animate-spin" size={20} /> Creating...</span>
                                    ) : (
                                        <>Create Account <ArrowRight size={18} /></>
                                    )}
                                </button>
                            </div>
                        </form>

                        <p className="mt-6 text-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="text-sm text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-dark))] font-medium underline"
                            >
                                Already have account? Login
                            </button>
                        </p>
                    </div>

                    <p className="mt-8 text-center text-xs font-medium text-[rgb(var(--text-muted))] tracking-wide">
                        © 2025 Pharmacy Management System V2. Secure Connection.
                    </p>
                </div>
            </div>

            {/* Visual Graphic */}
            <div className="hidden lg:block relative w-0 flex-1">
                <div className="absolute inset-0 h-full w-full bg-white/30 backdrop-blur-3xl border-l border-[rgb(var(--border-subtle))] overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[rgb(var(--color-primary))]/10 to-[rgb(var(--color-primary))]/5 rounded-full blur-3xl" />
                    <div className="absolute right-[-10%] top-[20%] w-[900px] h-[700px] bg-white/40 backdrop-blur-xl border border-white/50 rounded-l-3xl shadow-[0_30px_100px_rgba(0,0,0,0.1)] transform -rotate-[12deg] skew-x-[-12deg] p-12 overflow-hidden flex flex-col gap-6 opacity-80">
                        <div className="w-48 h-8 rounded-full bg-white/60" />
                        <div className="flex gap-6">
                            <div className="w-64 h-32 rounded-2xl bg-gradient-to-r from-[rgb(var(--color-primary))]/80 to-[rgb(var(--color-primary-light))] shadow-xl" />
                            <div className="w-64 h-32 rounded-2xl bg-white/60" />
                        </div>
                        <div className="flex-1 rounded-2xl bg-white/50 mt-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

