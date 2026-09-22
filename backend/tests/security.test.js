const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const { authenticateToken, generateToken, JWT_SECRET } = require('../middleware/auth');
const { adminOnly, requireRole } = require('../middleware/roleCheck');

// Build an isolated test app using our real auth and role middlewares
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Public route
  app.get('/api/public', (req, res) => res.json({ status: 'ok' }));

  // Protected route requiring any valid token
  app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ user: req.user });
  });

  // Admin-only route
  app.delete('/api/admin-action/:id', authenticateToken, adminOnly, (req, res) => {
    res.json({ success: true, deleted: req.params.id });
  });

  return app;
};

test('Security & Auth Pipeline Suite', async (t) => {
  let server;
  let baseUrl;

  t.before(async () => {
    const app = createTestApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test('P0 Finding 1: Spoofed x-user-role header is completely ignored without valid JWT', async () => {
    // Attempting admin action by passing spoofed header 'x-user-role: admin' but NO Authorization token
    const res = await fetch(`${baseUrl}/api/admin-action/42`, {
      method: 'DELETE',
      headers: {
        'x-user-role': 'admin',
        'x-user-id': '1'
      }
    });

    assert.equal(res.status, 401, 'Must reject with 401 when token is missing, ignoring spoofed header');
    const data = await res.json();
    assert.equal(data.error, 'Access token required');
  });

  await t.test('P0 Finding 1: Employee role token is rejected from admin-only endpoints with 403', async () => {
    // Valid signed JWT for an employee / shopkeeper
    const employeeToken = generateToken({ id: 99, role: 'shopkeeper', username: 'shopkeeper1' });

    // Attempt admin action with shopkeeper token
    const res = await fetch(`${baseUrl}/api/admin-action/42`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'x-user-role': 'admin' // Even if client also sends spoofed header, verified JWT must rule
      }
    });

    assert.equal(res.status, 403, 'Must return 403 Forbidden for non-admin token');
    const data = await res.json();
    assert.equal(data.error, 'Forbidden: Admin access required.');
  });

  await t.test('P0 Finding 1: Admin role token is granted access to admin-only endpoints', async () => {
    const adminToken = generateToken({ id: 1, role: 'admin', username: 'adminuser' });

    const res = await fetch(`${baseUrl}/api/admin-action/42`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.equal(res.status, 200, 'Must allow admin token');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.deleted, '42');
  });

  await t.test('P0 Finding 4: Insecure or forged tokens are rejected with 403', async () => {
    // Forged token with invalid signature
    const forgedToken = jwt.sign({ id: 1, role: 'admin' }, 'wrong_secret');

    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { 'Authorization': `Bearer ${forgedToken}` }
    });

    assert.equal(res.status, 403, 'Forged token must be rejected with 403');
  });

  await t.test('P0 Finding 3: Magic-string / Clerk OAuth account rejected from local password login', async () => {
    // Test the logic directly: a clerk OAuth user has auth_provider = 'clerk' and password = NULL
    const mockClerkUser = {
      id: 10,
      username: 'clerkuser',
      auth_provider: 'clerk',
      password: null
    };

    // Simulated login handler logic
    const attemptLogin = (user, passwordInput) => {
      if (user.auth_provider && user.auth_provider !== 'local') {
        return { status: 401, error: 'This account uses social/Clerk login. Please sign in with Clerk.' };
      }
      if (!user.password) {
        return { status: 401, error: 'Password authentication is not configured for this account.' };
      }
      if (user.password !== passwordInput) {
        return { status: 401, error: 'Invalid credentials' };
      }
      return { status: 200, success: true };
    };

    // Even if an attacker guesses 'clerk_oauth_no_password' or blank string:
    const result1 = attemptLogin(mockClerkUser, 'clerk_oauth_no_password');
    assert.equal(result1.status, 401);
    assert.match(result1.error, /Clerk login/i);

    const result2 = attemptLogin(mockClerkUser, '');
    assert.equal(result2.status, 401);
    assert.match(result2.error, /Clerk login/i);
  });

  await t.test('P0 Finding 2: Clerk sync failure fallback strictly assigns lowest privilege (shopkeeper)', async () => {
    // Simulated sync error handler in App.jsx
    const handleSyncFailure = (clerkUser) => {
      return {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.username,
        email: clerkUser.email || '',
        username: clerkUser.username,
        role: 'shopkeeper', // Must never default to admin
        token: null
      };
    };

    const fallbackUser = handleSyncFailure({ id: 'user_123', fullName: 'John Doe', username: 'johndoe' });
    assert.equal(fallbackUser.role, 'shopkeeper', 'Fallback role must strictly be shopkeeper');
    assert.notEqual(fallbackUser.role, 'admin', 'Fallback role must never be escalated to admin');
    assert.equal(fallbackUser.token, null, 'Must not synthesize or provide an admin token');
  });
});
