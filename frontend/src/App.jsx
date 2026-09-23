import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useUser, useClerk } from '@clerk/react';
import { Activity, AlertCircle } from 'lucide-react';
import useStore from './store/useStore';
import api, { setAuthToken, clearAuthToken } from './config/axios';

// Layout & Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ShopDashboard from './pages/ShopDashboard';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Employees from './pages/Employees';
import Forbidden from './pages/Forbidden';

// Helper to prevent access to guest routes when signed in
const GuestRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Navigate to="/" replace />;
  return children;
};

// Unassigned Shopkeeper Informational View
const UnassignedShopkeeperView = () => {
  const { signOut } = useClerk();
  const logout = useStore(state => state.logout);
  const user = useStore(state => state.user);

  const handleSignOut = async () => {
    logout();
    try {
      await signOut({ redirectUrl: '/login' });
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-slate-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Account Not Assigned</h2>
        <p className="text-sm text-slate-600">
          Hello {user?.name || 'Shopkeeper'}, your account has not been assigned to a pharmacy. Please contact your administrator.
        </p>
        <button
          onClick={handleSignOut}
          className="btn-primary w-full py-2.5 min-h-[44px]"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

// Protected Layout with dynamic sidebar navigation and ErrorBoundary
const ProtectedLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-[rgb(var(--color-bg))] overflow-hidden font-sans">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header toggleSidebar={() => setSidebarOpen(prev => !prev)} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-4 sm:p-6 lg:p-8 relative">
            <div className="max-w-7xl mx-auto animate-slide-up relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Protected route wrapper
const ProtectedRoute = ({ children, requiredAdmin = false }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const user = useStore(state => state.user);
  const isAdmin = useStore(state => state.isAdmin);

  if (!isLoaded) return null; // Clerk is still loading
  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (requiredAdmin && user && !isAdmin()) return <Navigate to="/forbidden" replace />;
  if (user && user.role === 'shopkeeper' && !user.admin_id) return <UnassignedShopkeeperView />;

  return <ProtectedLayout>{children}</ProtectedLayout>;
};

// Keeps the Clerk session token in sync with the axios interceptor.
// Runs on mount, on auth change, and refreshes every 55 s (Clerk tokens expire in 60 s).
const ClerkTokenSync = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      clearAuthToken();
      return;
    }

    let intervalId;

    const refresh = async () => {
      try {
        const token = await getToken();
        if (token) setAuthToken(token);
      } catch (e) {
        console.warn('[ClerkTokenSync] Failed to get session token:', e);
      }
    };

    refresh(); // immediate on sign-in
    intervalId = setInterval(refresh, 55_000); // refresh before 60s expiry

    return () => {
      clearInterval(intervalId);
    };
  }, [isSignedIn, isLoaded, getToken]);

  return null;
};

// Clerk Auth Sync Component to align Clerk state with Postgres local db
const ClerkAuthSync = ({ children }) => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const setUser = useStore(state => state.setUser);
  const logoutStore = useStore(state => state.logout);
  const [syncing, setSyncing] = useState(false);
  const syncedUserIdRef = useRef(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      logoutStore();
      syncedUserIdRef.current = null;
      isSyncingRef.current = false;
      return;
    }

    if (isSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      const username = clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || '';
      const full_name = clerkUser.fullName || clerkUser.firstName || '';

      // Guard: already synced this Clerk user in this session
      if (syncedUserIdRef.current === clerkUser.id) return;

      if (isSyncingRef.current) return;

      const syncUser = async () => {
        isSyncingRef.current = true;
        setSyncing(true);
        try {
          const token = await getToken();
          if (token) setAuthToken(token);

          const res = await api.post('/auth/clerk-sync', {
            email,
            full_name,
            username,
            clerk_id: clerkUser.id
          });
          syncedUserIdRef.current = clerkUser.id;
          setUser({ ...res.data.user, clerk_id: clerkUser.id });
        } catch (error) {
          console.error('Backend sync failed, falling back to restricted shopkeeper role:', error?.response?.data || error);
          // Fail closed: fall back to lowest privilege ('shopkeeper'), never 'admin'
          syncedUserIdRef.current = clerkUser.id;
          setUser({
            id: clerkUser.id,
            name: full_name || username,
            email: email || '',
            username: username,
            role: 'shopkeeper', // lowest privilege fallback; never default to admin
            clerk_id: clerkUser.id,
          });
        } finally {
          isSyncingRef.current = false;
          setSyncing(false);
        }
      };
      syncUser();
    }
  }, [isSignedIn, isLoaded, clerkUser, setUser, logoutStore]);

  if (!isLoaded || (isSignedIn && syncing)) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-white">
        <Activity className="animate-spin text-[rgb(var(--color-primary))] mb-4" size={48} aria-hidden="true" />
        <p className="text-sm font-medium text-[rgb(var(--text-body))] text-pretty">Syncing workspace session…</p>
      </div>
    );
  }

  return children;
};

// Role-aware home dashboard router
const HomeDashboard = () => {
  const isAdmin = useStore(state => state.isAdmin);
  return isAdmin() ? <Dashboard /> : <ShopDashboard />;
};

function App() {
  return (
    <ErrorBoundary>
      <ClerkTokenSync />
      <ClerkAuthSync>
        <Router>
          <Routes>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/forbidden" element={<Forbidden />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><HomeDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/shop/dashboard" element={<ProtectedRoute><ShopDashboard /></ProtectedRoute>} />
            <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredAdmin><Reports /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute requiredAdmin><Employees /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/forbidden" replace />} />
          </Routes>
        </Router>
      </ClerkAuthSync>
    </ErrorBoundary>
  );
}

export default App;
