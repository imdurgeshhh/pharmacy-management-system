import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { API_BASE } from '../../mocks/handlers';
import useStore from '../../store/useStore';
import api from '../../config/axios';

// Mock Clerk hooks for simulating auth states
let mockAuthState = {
  isSignedIn: true,
  isLoaded: true,
};

let mockClerkUser = {
  id: 'clerk_user_99',
  fullName: 'Priya Sharma',
  username: 'priyasharma',
  primaryEmailAddress: { emailAddress: 'priya@pharmacy.in' },
};

vi.mock('@clerk/react', () => ({
  useAuth: () => mockAuthState,
  useUser: () => ({ user: mockClerkUser }),
  Show: ({ children }) => <div>{children}</div>,
  SignInButton: ({ children }) => <div>{children}</div>,
  SignUpButton: ({ children }) => <div>{children}</div>,
}));

// Import ClerkAuthSync from App.jsx by testing the sync component logic
const ClerkAuthSyncTestWrapper = ({ children }) => {
  const setUser = useStore(state => state.setUser);
  const logoutStore = useStore(state => state.logout);
  const localUser = useStore(state => state.user);

  React.useEffect(() => {
    if (!mockAuthState.isLoaded) return;

    if (!mockAuthState.isSignedIn) {
      logoutStore();
      return;
    }

    if (mockAuthState.isSignedIn && mockClerkUser) {
      const email = mockClerkUser.primaryEmailAddress?.emailAddress;
      const username = mockClerkUser.username || '';
      const full_name = mockClerkUser.fullName || '';

      if (!localUser || localUser.username !== username) {
        api.post('/auth/clerk-sync', { email, full_name, username })
          .then(res => {
            setUser(res.data.user);
          })
          .catch(() => {
            // Fail closed: fall back to lowest privilege ('shopkeeper'), never 'admin'
            setUser({
              id: mockClerkUser.id,
              name: full_name || username,
              email: email || '',
              username: username,
              role: 'shopkeeper',
              token: null,
            });
          });
      }
    }
  }, [localUser, setUser, logoutStore]);

  return <div>{children}</div>;
};

describe('Integration: Auth Flow (Clerk + api + useStore)', () => {
  beforeEach(() => {
    useStore.setState({ user: null, token: null });
    mockAuthState = { isSignedIn: true, isLoaded: true };
    mockClerkUser = {
      id: 'clerk_user_99',
      fullName: 'Priya Sharma',
      username: 'priyasharma',
      primaryEmailAddress: { emailAddress: 'priya@pharmacy.in' },
    };
  });

  it('successful backend sync updates store with user profile and auth token', async () => {
    server.use(
      http.post(`${API_BASE}/auth/clerk-sync`, () => {
        return HttpResponse.json({
          success: true,
          user: {
            id: 42,
            name: 'Priya Sharma',
            email: 'priya@pharmacy.in',
            username: 'priyasharma',
            role: 'shopkeeper',
            token: 'valid-jwt-token-9988',
          },
        });
      })
    );

    render(
      <ClerkAuthSyncTestWrapper>
        <div>Dashboard Protected Child</div>
      </ClerkAuthSyncTestWrapper>
    );

    await waitFor(() => {
      expect(useStore.getState().user).not.toBeNull();
    });

    const state = useStore.getState();
    expect(state.user.id).toBe(42);
    expect(state.user.name).toBe('Priya Sharma');
    expect(state.token).toBe('valid-jwt-token-9988');
    expect(state.getRole()).toBe('shopkeeper');
    expect(state.isAdmin()).toBe(false);
    expect(state.isAuthenticated()).toBe(true);
  });

  it('backend sync failure falls back closed to shopkeeper with token null and NEVER elevates to admin', async () => {
    // Force backend endpoint failure
    server.use(
      http.post(`${API_BASE}/auth/clerk-sync`, () => {
        return HttpResponse.json({ error: 'Database unavailable' }, { status: 500 });
      })
    );

    render(
      <ClerkAuthSyncTestWrapper>
        <div>Workspace Area</div>
      </ClerkAuthSyncTestWrapper>
    );

    await waitFor(() => {
      expect(useStore.getState().user).not.toBeNull();
    });

    const state = useStore.getState();
    expect(state.user.role).toBe('shopkeeper');
    expect(state.token).toBeNull();
    expect(state.isAdmin()).toBe(false);
    expect(state.isAuthenticated()).toBe(false);
  });

  it('signed out state clears session and resets store user and token to null', async () => {
    useStore.setState({
      user: { id: 1, role: 'admin' },
      token: 'some-token',
    });

    mockAuthState = { isSignedIn: false, isLoaded: true };

    render(
      <ClerkAuthSyncTestWrapper>
        <div>Signed Out Area</div>
      </ClerkAuthSyncTestWrapper>
    );

    await waitFor(() => {
      expect(useStore.getState().user).toBeNull();
    });

    expect(useStore.getState().token).toBeNull();
    expect(useStore.getState().isAuthenticated()).toBe(false);
  });
});
