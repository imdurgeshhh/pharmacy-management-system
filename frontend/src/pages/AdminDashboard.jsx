import React from 'react';
import Dashboard from './Dashboard'; // Full access

const AdminDashboard = () => {
    return (
        <>
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                <h3 className="text-lg font-bold text-[rgb(var(--text-heading))] flex items-center gap-2">
                    👑 Admin Dashboard - Full Access
                </h3>
                <p className="text-sm text-[rgb(var(--text-muted))] mt-1">Complete system control, reports, user management.</p>
            </div>
            <Dashboard />
        </>
    );
};

export default AdminDashboard;

