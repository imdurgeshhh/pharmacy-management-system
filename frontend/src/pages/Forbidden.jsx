import React from 'react';
import { ShieldAlert } from 'lucide-react';

const Forbidden = () => (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-md w-full space-y-8 text-center">
            <div className="w-32 h-32 mx-auto mb-8 bg-red-100 rounded-3xl flex items-center justify-center">
                <ShieldAlert size={64} className="text-red-500" />
            </div>
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-display font-extrabold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent tracking-tight">
                    403
                </h1>
                <h2 className="text-2xl font-bold text-[rgb(var(--text-heading))]">
                    Forbidden
                </h2>
                <p className="text-lg text-[rgb(var(--text-body))] max-w-sm mx-auto">
                    You don&apos;t have permission to access this page.
                </p>
            </div>
            <button 
                onClick={() => window.history.back()}
                className="btn-primary px-8 py-3 text-lg font-medium"
            >
                Go Back
            </button>
        </div>
    </div>
);

export default Forbidden;

