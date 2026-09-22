'use strict';

/**
 * authHelper.js — Role identity helpers for API tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Works with testApp.js's Clerk mock. For each role, there is:
 *   - A fixed email address that matches a seeded row in the test DB (employees)
 *   - A mock Clerk auth object with that email in sessionClaims
 *
 * roleCheck.js looks up the role by email from sessionClaims, so the test DB
 * seed must have employees with these exact emails. See dbHelper.js.
 *
 * Usage (with Supertest):
 *   const request = require('supertest');
 *   const { app } = require('./testApp');
 *   const auth = require('./authHelper');
 *
 *   // Admin request:
 *   auth.asAdmin();
 *   await request(app).get('/api/employees').expect(200);
 *   auth.clear();
 *
 *   // Or use the fluent helper (sets and clears automatically):
 *   await auth.withRole('admin', () => request(app).get('/api/employees'));
 */

const { setMockAuth, clearMockAuth } = require('./testApp');

// ── Seeded identities (must match dbHelper.js seed emails) ───────────────────

const IDENTITIES = {
  admin: {
    userId: 'clerk_test_admin_001',
    sessionClaims: { email: 'admin@test.pharma' },
  },
  shopkeeper: {
    userId: 'clerk_test_shop_001',
    sessionClaims: { email: 'shopkeeper@test.pharma' },
  },
  employee: {
    userId: 'clerk_test_emp_001',
    sessionClaims: { email: 'employee@test.pharma' },
  },
  adminB: {
    userId: 'clerk_test_admin_002',
    sessionClaims: { email: 'admin_b@test.pharma' },
  },
  shopkeeperB: {
    userId: 'clerk_test_shop_002',
    sessionClaims: { email: 'shopkeeper_b@test.pharma' },
  },
  unassignedShopkeeper: {
    userId: 'clerk_test_unassigned_shop_001',
    sessionClaims: { email: 'unassigned@test.pharma' },
  },
};

/** Set admin identity for the next request. Call clear() after. */
function asAdmin() { setMockAuth(IDENTITIES.admin); }
function asAdminA() { setMockAuth(IDENTITIES.admin); }
function asAdminB() { setMockAuth(IDENTITIES.adminB); }

/** Set shopkeeper identity for the next request. Call clear() after. */
function asShopkeeper() { setMockAuth(IDENTITIES.shopkeeper); }
function asShopkeeperA() { setMockAuth(IDENTITIES.shopkeeper); }
function asShopkeeperB() { setMockAuth(IDENTITIES.shopkeeperB); }
function asUnassignedShopkeeper() { setMockAuth(IDENTITIES.unassignedShopkeeper); }

/** Set employee identity for the next request. Call clear() after. */
function asEmployee() { setMockAuth(IDENTITIES.employee); }

/** Remove mock auth — simulates an unauthenticated (anonymous) request. */
function clear() { clearMockAuth(); }

/**
 * Fluent helper: sets role identity, awaits the request thunk, clears.
 * Guarantees clearMockAuth() even if the request throws.
 *
 * @param {'admin'|'shopkeeper'|'employee'|'anon'} role
 * @param {() => Promise<any>} requestThunk  e.g. () => request(app).get('/...')
 * @returns {Promise<any>} supertest response
 */
async function withRole(role, requestThunk) {
  if (role === 'anon') {
    clearMockAuth();
  } else {
    const identity = IDENTITIES[role];
    if (!identity) throw new Error(`Unknown role: "${role}". Use admin, shopkeeper, employee, or anon.`);
    setMockAuth(identity);
  }
  try {
    return await requestThunk();
  } finally {
    clearMockAuth();
  }
}

/**
 * Returns the email for the given role — useful for seeding test data
 * that references an employee by email.
 */
function emailFor(role) {
  return IDENTITIES[role]?.sessionClaims?.email ?? null;
}

module.exports = {
  asAdmin,
  asAdminA,
  asAdminB,
  asShopkeeper,
  asShopkeeperA,
  asShopkeeperB,
  asUnassignedShopkeeper,
  asEmployee,
  clear,
  withRole,
  emailFor,
  IDENTITIES
};
