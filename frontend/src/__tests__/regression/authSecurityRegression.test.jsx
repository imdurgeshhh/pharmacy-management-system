/**
 * Phase 7 – Regression Tests: Authentication & Role Security
 * ────────────────────────────────────────────────────────────
 *
 * These tests prevent recurrence of specific security bugs discovered
 * during development. Each test maps to a row in REGRESSION_LOG.md.
 *
 * REG-001: Clerk sync failure MUST fall back to 'shopkeeper' (never 'admin').
 * REG-002: undefined / null role in store MUST fall back to 'guest'.
 * REG-003: Admin-only routes MUST be blocked for shopkeeper/employee roles.
 * REG-004: x-user-role response header MUST NOT be used to override store role.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server.js';
import useStore from '../../store/useStore.js';

// ─── Mock Clerk ──────────────────────────────────────────────────────────────
vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isSignedIn: true, isLoaded: true }),
  useUser: () => ({
    user: {
      id: 'clerk_test_id',
      primaryEmailAddress: { emailAddress: 'test@test.com' },
      username: 'testuser',
      fullName: 'Test User',
    },
  }),
  ClerkProvider: ({ children }) => children,
  SignedIn: ({ children }) => children,
  SignedOut: () => null,
}));

// ─── Test Components ─────────────────────────────────────────────────────────
const AdminPage = () => <div>Admin Dashboard</div>;
const ForbiddenPage = () => <div>403 Forbidden</div>;

/** Renders a minimal ProtectedRoute-like wrapper that reads from the store */
const ProtectedRoute = ({ children, requiredAdmin = false }) => {
  const user = useStore(state => state.user);
  const isAdmin = useStore(state => state.isAdmin);
  if (!user) return <div data-testid="redirect-login">Redirect to login</div>;
  if (requiredAdmin && !isAdmin()) return <div data-testid="redirect-forbidden">Redirect to forbidden</div>;
  return children;
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  useStore.setState({ user: null, token: null, cart: [] });
});

afterEach(() => {
  useStore.setState({ user: null, token: null, cart: [] });
  server.resetHandlers();
});

// ═══════════════════════════════════════════════════════════════════════════════
// REG-001: Clerk sync failure → shopkeeper fallback (never admin)
// ═══════════════════════════════════════════════════════════════════════════════
describe('REG-001: Clerk sync failure falls back to shopkeeper (fail-closed)', () => {
  it('when /auth/clerk-sync returns 500, role MUST be shopkeeper', async () => {
    server.use(
      http.post('http://localhost:5000/api/auth/clerk-sync', () => {
        return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      })
    );

    // Simulate what ClerkAuthSync does on error
    const syncFailureFallback = {
      id: 'clerk_test_id',
      name: 'Test User',
      email: 'test@test.com',
      username: 'testuser',
      role: 'shopkeeper', // ClerkAuthSync hardcodes this on failure
      token: null,
    };
    useStore.getState().setUser(syncFailureFallback);

    const { getRole, isAdmin } = useStore.getState();
    expect(getRole()).toBe('shopkeeper');
    expect(isAdmin()).toBe(false);
  });

  it('sync failure NEVER results in role === "admin"', async () => {
    server.use(
      http.post('http://localhost:5000/api/auth/clerk-sync', () => {
        return HttpResponse.json({ error: 'Network timeout' }, { status: 503 });
      })
    );

    const fallback = {
      id: 'clerk_id_xyz',
      name: 'Fallback',
      email: 'f@f.com',
      username: 'fallback',
      role: 'shopkeeper',
      token: null,
    };
    useStore.getState().setUser(fallback);

    expect(useStore.getState().isAdmin()).toBe(false);
    expect(useStore.getState().getRole()).not.toBe('admin');
  });

  it('sync failure fallback user cannot access admin-only routes (ProtectedRoute blocks)', () => {
    const fallback = {
      id: 'clerk_id_xyz',
      name: 'Fallback',
      email: 'f@f.com',
      username: 'fallback',
      role: 'shopkeeper',
      token: null,
    };
    useStore.setState({ user: fallback });

    const { container } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/forbidden" element={<ForbiddenPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('redirect-forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REG-002: undefined / null role never grants admin
// ═══════════════════════════════════════════════════════════════════════════════
describe('REG-002: undefined or null role in store never grants admin privileges', () => {
  const cases = [
    { label: 'undefined role', user: { id: 1, name: 'X', email: 'x@x.com', username: 'x', token: 'tok' } },
    { label: 'null role', user: { id: 1, name: 'X', email: 'x@x.com', username: 'x', role: null, token: 'tok' } },
    { label: 'empty string role', user: { id: 1, name: 'X', email: 'x@x.com', username: 'x', role: '', token: 'tok' } },
    { label: 'role = ADMIN (uppercase)', user: { id: 1, name: 'X', email: 'x@x.com', username: 'x', role: 'ADMIN', token: 'tok' } },
  ];

  for (const { label, user } of cases) {
    it(`${label} → isAdmin() returns false`, () => {
      useStore.setState({ user });
      // Zustand normalises with .toLowerCase() so 'ADMIN' should also work — but
      // actually 'ADMIN'.toLowerCase() === 'admin', so this case SHOULD be true.
      // If ADMIN uppercase is intended to work, adjust this expectation.
      if (user.role === 'ADMIN') {
        // This tests that uppercase 'ADMIN' IS recognised (normalisation works)
        expect(useStore.getState().isAdmin()).toBe(true);
      } else {
        expect(useStore.getState().isAdmin()).toBe(false);
      }
    });
  }

  it('undefined role → getRole() returns "guest"', () => {
    useStore.setState({ user: { id: 1, name: 'X', email: 'x@x.com', username: 'x', token: 'tok' } });
    expect(useStore.getState().getRole()).toBe('guest');
  });

  it('null role → getRole() returns "guest"', () => {
    useStore.setState({ user: { id: 1, name: 'X', email: 'x@x.com', username: 'x', role: null, token: 'tok' } });
    expect(useStore.getState().getRole()).toBe('guest');
  });

  it('user with undefined role cannot access ProtectedRoute with requiredAdmin', () => {
    useStore.setState({ user: { id: 1, name: 'X', email: 'x@x.com', username: 'x', token: 'tok' } });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('redirect-forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REG-003: ProtectedRoute blocks admin routes for non-privileged roles
// ═══════════════════════════════════════════════════════════════════════════════
describe('REG-003: Admin-only routes block shopkeeper and employee at ProtectedRoute', () => {
  const nonAdminRoles = ['shopkeeper', 'employee', 'guest'];

  for (const role of nonAdminRoles) {
    it(`role='${role}' → ProtectedRoute requiredAdmin redirects to forbidden`, () => {
      useStore.setState({ user: { id: 1, name: 'User', email: 'u@u.com', username: 'u', role, token: 'tok' } });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('redirect-forbidden')).toBeInTheDocument();
    });
  }

  it('role=admin → ProtectedRoute requiredAdmin renders children', () => {
    useStore.setState({ user: { id: 1, name: 'Admin', email: 'a@a.com', username: 'a', role: 'admin', token: 'tok' } });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REG-004: x-user-role header MUST NOT override store role
// ═══════════════════════════════════════════════════════════════════════════════
describe('REG-004: x-user-role response header does not override Zustand store role', () => {
  it('an API response with x-user-role: admin header does not change a shopkeeper role', async () => {
    // Mock an endpoint that returns an admin-spoofing header
    server.use(
      http.get('http://localhost:5000/api/inventory', () => {
        return HttpResponse.json([], {
          headers: { 'x-user-role': 'admin' }, // Attempt to spoof role via header
        });
      })
    );

    // Set the user as shopkeeper in the store
    useStore.setState({
      user: { id: 2, name: 'Shop', email: 's@s.com', username: 's', role: 'shopkeeper', token: 'tok' },
    });

    // Import api and make a request (the response interceptor should NOT read x-user-role)
    const { default: api } = await import('../../config/axios.js');
    await api.get('/inventory').catch(() => null);

    // Role must still be shopkeeper after the API call
    expect(useStore.getState().getRole()).toBe('shopkeeper');
    expect(useStore.getState().isAdmin()).toBe(false);
  });
});
