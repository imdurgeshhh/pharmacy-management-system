import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import Forbidden from '../../pages/Forbidden';

// Replicating ProtectedRoute from App.jsx
const ProtectedRoute = ({ children, requiredAdmin = false }) => {
  const user = useStore(state => state.user);
  const isAdmin = useStore(state => state.isAdmin);

  if (!user) return <Navigate to="/login" replace />;
  if (requiredAdmin && !isAdmin()) return <Navigate to="/forbidden" replace />;

  return <div>{children}</div>;
};

const TestAppRoutes = ({ initialRoute = '/' }) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <Routes>
      <Route path="/login" element={<div>Login Page Screen</div>} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><div>General Dashboard Screen</div></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute requiredAdmin><div>Admin Dashboard Screen</div></ProtectedRoute>} />
      <Route path="/shop/dashboard" element={<ProtectedRoute><div>Shop Dashboard Screen</div></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute requiredAdmin><div>Reports Screen</div></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute requiredAdmin><div>Employees Screen</div></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute><div>POS Screen</div></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>
);

describe('Integration: RoleGuard & Router Access Control (App.jsx)', () => {
  beforeEach(() => {
    useStore.setState({ user: null, token: null });
  });

  it('unauthenticated user navigating to protected routes redirects to /login', () => {
    useStore.setState({ user: null, token: null });

    render(<TestAppRoutes initialRoute="/admin/dashboard" />);

    expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard Screen')).not.toBeInTheDocument();
  });

  it('admin user can access /admin/dashboard, /reports, and /employees', () => {
    useStore.setState({
      user: { id: 1, name: 'Admin Boss', role: 'admin' },
      token: 'jwt-admin',
    });

    const { unmount } = render(<TestAppRoutes initialRoute="/admin/dashboard" />);
    expect(screen.getByText('Admin Dashboard Screen')).toBeInTheDocument();
    unmount();

    const { unmount: unmount2 } = render(<TestAppRoutes initialRoute="/reports" />);
    expect(screen.getByText('Reports Screen')).toBeInTheDocument();
    unmount2();

    render(<TestAppRoutes initialRoute="/employees" />);
    expect(screen.getByText('Employees Screen')).toBeInTheDocument();
  });

  it('shopkeeper user attempting to access /admin/dashboard is redirected to /forbidden', () => {
    useStore.setState({
      user: { id: 2, name: 'Shopkeeper User', role: 'shopkeeper' },
      token: 'jwt-shopkeeper',
    });

    render(<TestAppRoutes initialRoute="/admin/dashboard" />);

    expect(screen.queryByText('Admin Dashboard Screen')).not.toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.getByText(/You don't have permission to access this page/i)).toBeInTheDocument();
  });

  it('employee user attempting to access /reports is redirected to /forbidden', () => {
    useStore.setState({
      user: { id: 3, name: 'Counter Staff', role: 'employee' },
      token: 'jwt-employee',
    });

    render(<TestAppRoutes initialRoute="/reports" />);

    expect(screen.queryByText('Reports Screen')).not.toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.getByText(/You don't have permission to access this page/i)).toBeInTheDocument();
  });

  it('regression: sync failure fallback never elevates role to admin on protected routes', () => {
    // Simulating fallback state created by Clerk sync failure in App.jsx:
    // role is 'shopkeeper' with token: null
    useStore.setState({
      user: {
        id: 'clerk_guest_101',
        name: 'Sync Failed User',
        username: 'sync_failed',
        role: 'shopkeeper', // strictly lowest privilege
        token: null,
      },
      token: null,
    });

    render(<TestAppRoutes initialRoute="/admin/dashboard" />);

    // Must never render admin dashboard
    expect(screen.queryByText('Admin Dashboard Screen')).not.toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });
});
