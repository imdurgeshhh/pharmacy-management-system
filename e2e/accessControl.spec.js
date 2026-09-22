/**
 * Phase 4 E2E – Access Control (Direct URL Navigation)
 * ─────────────────────────────────────────────────────────────────────────
 * This is the security-critical spec. It verifies that direct URL navigation
 * to protected routes cannot be bypassed by non-privileged roles.
 *
 * Tests covered:
 *  - @smoke Unauthenticated → /login for every protected route
 *  - @smoke Shopkeeper → /forbidden for admin-only routes
 *  - @smoke Employee → /forbidden for admin-only routes
 *  - Admin → allowed for all routes
 *  - Wildcard/unknown routes redirect to /forbidden
 *  - Regression: sync-failure fallback user (shopkeeper) cannot access admin routes
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsShopkeeper, loginAsEmployee, logout } from './helpers/auth.js';

/** All routes that require admin role */
const ADMIN_ONLY_ROUTES = ['/admin/dashboard', '/reports', '/employees'];

/** Routes accessible to any authenticated user */
const SHARED_ROUTES = ['/pos', '/inventory', '/purchases', '/suppliers', '/shop/dashboard'];

test.describe('Access Control – Direct URL Navigation', () => {
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Unauthenticated ──────────────────────────────────────────────────────

  for (const route of [...ADMIN_ONLY_ROUTES, ...SHARED_ROUTES, '/']) {
    test(`unauthenticated direct visit to ${route} redirects to /login @smoke`, async ({ page }) => {
      // Clear any auth before navigating
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('pharma-storage'));
      await page.goto(route);
      await page.waitForURL('**/login', { timeout: 5000 });
      await expect(page).toHaveURL(/\/login/);
    });
  }

  // ── Shopkeeper ───────────────────────────────────────────────────────────

  for (const route of ADMIN_ONLY_ROUTES) {
    test(`shopkeeper direct visit to ${route} → /forbidden @smoke`, async ({ page }) => {
      await loginAsShopkeeper(page);
      await page.goto(route);
      await page.waitForURL('**/forbidden', { timeout: 5000 });
      await expect(page).toHaveURL(/\/forbidden/);
    });
  }

  for (const route of SHARED_ROUTES) {
    test(`shopkeeper can access ${route}`, async ({ page }) => {
      await loginAsShopkeeper(page);
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/forbidden/);
      await expect(page).not.toHaveURL(/\/login/);
    });
  }

  // ── Employee ─────────────────────────────────────────────────────────────

  for (const route of ADMIN_ONLY_ROUTES) {
    test(`employee direct visit to ${route} → /forbidden`, async ({ page }) => {
      await loginAsEmployee(page);
      await page.goto(route);
      await page.waitForURL('**/forbidden', { timeout: 5000 });
      await expect(page).toHaveURL(/\/forbidden/);
    });
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  for (const route of [...ADMIN_ONLY_ROUTES, ...SHARED_ROUTES]) {
    test(`admin can access ${route} @smoke`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/forbidden/);
      await expect(page).not.toHaveURL(/\/login/);
    });
  }

  // ── Wildcard ─────────────────────────────────────────────────────────────

  test('unknown route redirects authenticated user to /forbidden', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/this-route-does-not-exist-xyz');
    // App.jsx has <Route path="*" element={<Navigate to="/forbidden" replace />}
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });

  // ── Regression: sync-failure fallback ────────────────────────────────────

  test('regression: clerk sync failure user (shopkeeper fallback) cannot access /admin/dashboard', async ({ page }) => {
    // Simulate the exact fallback user that ClerkAuthSync assigns on backend failure
    await page.goto('/');
    await page.evaluate(() => {
      const syncFailureFallback = {
        id: 'clerk_user_id_xyz',
        name: 'Fallback User',
        email: 'fallback@test.com',
        username: 'fallback',
        role: 'shopkeeper', // ← lowest privilege, as per ClerkAuthSync fail-closed
        token: null,        // ← no token on failure
      };
      localStorage.setItem('pharma-storage', JSON.stringify({
        state: { user: syncFailureFallback },
        version: 0,
      }));
    });

    await page.goto('/admin/dashboard');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test('regression: user with undefined role cannot access admin routes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const noRoleUser = {
        id: 999,
        name: 'No Role User',
        email: 'norole@test.com',
        username: 'norole',
        // role is intentionally omitted
        token: 'some-token',
      };
      localStorage.setItem('pharma-storage', JSON.stringify({
        state: { user: noRoleUser },
        version: 0,
      }));
    });

    await page.goto('/admin/dashboard');
    // Should fall back to guest role → forbidden
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test('regression: null role in store falls back to guest and blocks admin', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const nullRoleUser = {
        id: 998,
        name: 'Null Role User',
        email: 'null@test.com',
        username: 'nullrole',
        role: null,
        token: 'some-token',
      };
      localStorage.setItem('pharma-storage', JSON.stringify({
        state: { user: nullRoleUser },
        version: 0,
      }));
    });

    await page.goto('/admin/dashboard');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });
});
