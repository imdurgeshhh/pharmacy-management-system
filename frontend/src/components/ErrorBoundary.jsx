import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg,248_250_252))] p-6 font-sans">
                    <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xl border border-red-100">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                            <AlertTriangle size={28} aria-hidden="true" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                        <p className="text-sm text-slate-600 mb-6 text-pretty">
                            {this.state.error?.message || 'An unexpected error occurred in this view.'}
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <RefreshCw size={16} aria-hidden="true" /> Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
