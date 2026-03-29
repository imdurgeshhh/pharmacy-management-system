import React from 'react';
import { Navigate } from 'react-router-dom';
import useStore from '../store/useStore';

const RoleGuard = ({ children, requiredAdmin = false, fallback = null, shopOnly = false }) => {
    const user = useStore(state => state.user);
    const getRole = useStore(state => state.getRole);
    const role = getRole(); // already normalized to lowercase via useStore

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredAdmin && role !== 'admin') {
        return fallback || <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-[rgb(var(--text-heading))] mb-4">403 Forbidden</h2>
            <p className="text-[rgb(var(--text-body))] mb-6">You don&apos;t have permission to access this area.</p>
            <button 
                onClick={() => window.location.href = role === 'shopkeeper' ? '/shop/dashboard' : '/'}
                className="btn-primary px-6 py-2"
            >
                Go to Dashboard
            </button>
        </div>;
    }

    if (shopOnly && role !== 'shopkeeper') {
        return fallback || <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default RoleGuard;
