import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import RoleGuard from './components/RoleGuard';

// Layout & Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

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

const ProtectedRoute = ({ children, requiredAdmin = false }) => {
  const user = useStore(state => state.user);
  const isAdmin = useStore(state => state.isAdmin);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (requiredAdmin && !isAdmin()) return <Navigate to="/forbidden" replace />;

  return (
    <div className="flex bg-transparent min-h-screen relative overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-0">
        <Header toggleSidebar={() => setSidebarOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto animate-slide-up relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forbidden" element={<Forbidden />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
  );
}

export default App;
