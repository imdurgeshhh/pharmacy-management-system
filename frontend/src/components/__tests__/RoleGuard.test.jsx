import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleGuard from '../RoleGuard';
import useStore from '../../store/useStore';

describe('components/RoleGuard.jsx - Access Control Matrix', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { href: 'http://localhost/' };
    useStore.setState({ user: null, token: null });
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  const renderWithRouter = (ui, initialPath = '/protected') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login Page Target</div>} />
          <Route path="/" element={<div>Home Page Target</div>} />
          <Route path="/protected" element={ui} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Unauthenticated State (No User)', () => {
    it('redirects unauthenticated user to /login', () => {
      useStore.setState({ user: null, token: null });

      renderWithRouter(
        <RoleGuard>
          <div>Protected Content</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    });
  });

  describe('Admin Routes (requiredAdmin: true)', () => {
    it('grants access and renders children when role is admin', () => {
      useStore.setState({
        user: { id: 1, role: 'admin' },
        token: 'admin-token',
      });

      renderWithRouter(
        <RoleGuard requiredAdmin={true}>
          <div data-testid="admin-content">Admin Portal Active</div>
        </RoleGuard>
      );

      expect(screen.getByTestId('admin-content')).toHaveTextContent('Admin Portal Active');
      expect(screen.queryByText('403 Forbidden')).not.toBeInTheDocument();
    });

    it('rejects shopkeeper role from admin route and displays 403 Forbidden', () => {
      useStore.setState({
        user: { id: 2, role: 'shopkeeper' },
        token: 'shop-token',
      });

      renderWithRouter(
        <RoleGuard requiredAdmin={true}>
          <div>Admin Super Secret</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin Super Secret')).not.toBeInTheDocument();
      expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission to access this area/i)).toBeInTheDocument();

      const dashboardBtn = screen.getByRole('button', { name: /Go to Dashboard/i });
      fireEvent.click(dashboardBtn);
      expect(window.location.href).toBe('/shop/dashboard');
    });

    it('rejects employee role from admin route and displays 403 Forbidden', () => {
      useStore.setState({
        user: { id: 3, role: 'employee' },
        token: 'emp-token',
      });

      renderWithRouter(
        <RoleGuard requiredAdmin={true}>
          <div>Admin Super Secret</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin Super Secret')).not.toBeInTheDocument();
      expect(screen.getByText('403 Forbidden')).toBeInTheDocument();

      const dashboardBtn = screen.getByRole('button', { name: /Go to Dashboard/i });
      fireEvent.click(dashboardBtn);
      expect(window.location.href).toBe('/');
    });

    it('rejects user with missing/undefined role and treats as guest with 403 Forbidden', () => {
      useStore.setState({
        user: { id: 4 /* role is undefined */ },
        token: 'token-without-role',
      });

      renderWithRouter(
        <RoleGuard requiredAdmin={true}>
          <div>Admin Super Secret</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin Super Secret')).not.toBeInTheDocument();
      expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    });

    it('renders custom fallback element when provided for unauthorized attempt', () => {
      useStore.setState({
        user: { id: 5, role: 'shopkeeper' },
        token: 'token',
      });

      renderWithRouter(
        <RoleGuard requiredAdmin={true} fallback={<div data-testid="custom-fallback">Custom Access Denied</div>}>
          <div>Admin Only Section</div>
        </RoleGuard>
      );

      expect(screen.getByTestId('custom-fallback')).toHaveTextContent('Custom Access Denied');
      expect(screen.queryByText('403 Forbidden')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin Only Section')).not.toBeInTheDocument();
    });
  });

  describe('Shopkeeper-Only Routes (shopOnly: true)', () => {
    it('renders children when user role is shopkeeper', () => {
      useStore.setState({
        user: { id: 6, role: 'shopkeeper' },
        token: 'token',
      });

      renderWithRouter(
        <RoleGuard shopOnly={true}>
          <div>Shopkeeper Portal</div>
        </RoleGuard>
      );

      expect(screen.getByText('Shopkeeper Portal')).toBeInTheDocument();
    });

    it('redirects admin to "/" when accessing shopOnly route', () => {
      useStore.setState({
        user: { id: 1, role: 'admin' },
        token: 'token',
      });

      renderWithRouter(
        <RoleGuard shopOnly={true}>
          <div>Shopkeeper Portal</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Shopkeeper Portal')).not.toBeInTheDocument();
      expect(screen.getByText('Home Page Target')).toBeInTheDocument();
    });

    it('redirects employee to "/" when accessing shopOnly route', () => {
      useStore.setState({
        user: { id: 7, role: 'employee' },
        token: 'token',
      });

      renderWithRouter(
        <RoleGuard shopOnly={true}>
          <div>Shopkeeper Portal</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Shopkeeper Portal')).not.toBeInTheDocument();
      expect(screen.getByText('Home Page Target')).toBeInTheDocument();
    });
  });

  describe('General Authenticated Routes', () => {
    it('renders children for any authenticated user when requiredAdmin and shopOnly are false', () => {
      useStore.setState({
        user: { id: 8, role: 'employee' },
        token: 'token',
      });

      renderWithRouter(
        <RoleGuard>
          <div>General Pharmacy Staff Area</div>
        </RoleGuard>
      );

      expect(screen.getByText('General Pharmacy Staff Area')).toBeInTheDocument();
    });
  });
});
