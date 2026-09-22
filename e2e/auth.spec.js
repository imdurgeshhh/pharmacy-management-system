/**
 * Phase 4 E2E – Authentication & Role Dashboard Routing
 * ──────────────────────────────────────────────────────
 * Tests covered:
 *  - @smoke Unauthenticated user is redirected to /login
 *  - @smoke Admin login -> lands on /, sees admin-specific nav items
 *  - @smoke Shopkeeper login -> lands on /, does NOT see Reports/Employees nav
 *  - Admin can navigate to /admin/dashboard
 *  - Shopkeeper navigating to /admin/dashboard -> redirected to /forbidden
 *  - Employee navigating to /admin/dashboard -> redirected to /forbidden
 *  - /login page renders Clerk sign-in button
 *  - Logout clears state and redirects to /login on next protected visit
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsShopkeeper, loginAsEmployee, logout } from './helpers/auth.js';

test.describe('Authentication & Role Routing', () => {
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Unauthenticated ──────────────────────────────────────────────────────

  test('unauthenticated user visiting / is redirected to /login @smoke', async ({ page }) => {
    // Clear any existing auth first
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('pharma-storage'));
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('/login page renders Clerk sign-in button', async ({ page }) => {
    await page.goto('/login');
    // The login page renders a "Sign In with Clerk" button
    const signInBtn = page.getByRole('button', { name: /sign in with clerk/i });
    await expect(signInBtn).toBeVisible();
  });

  test('unauthenticated user visiting /admin/dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('pharma-storage'));
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Admin ────────────────────────────────────────────────────────────────

  test('admin login -> navigates to / successfully @smoke', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    // Dashboard renders — no redirect to /login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\//);
  });

  test('admin can navigate to /admin/dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');
    await expect(page).not.toHaveURL(/\/forbidden/);
    await expect(page).not.toHaveURL(/\/login/);
    // Page body renders (not a blank redirect)
    await expect(page.locator('main, [data-testid="admin-dashboard"]')).toBeVisible({ timeout: 5000 });
  });

  test('admin sidebar shows Reports and Employees links @smoke', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    // Admin should see admin-only nav items in the sidebar
    const sidebar = page.locator('nav, aside, [data-testid="sidebar"]').first();
    await expect(page.getByRole('link', { name: /reports/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /employees/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('admin can navigate to /reports', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/reports');
    await expect(page).not.toHaveURL(/\/forbidden/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('admin can navigate to /employees', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/employees');
    await expect(page).not.toHaveURL(/\/forbidden/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Shopkeeper ───────────────────────────────────────────────────────────

  test('shopkeeper login -> lands on / without forbidden redirect @smoke', async ({ page }) => {
    await loginAsShopkeeper(page);
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/forbidden/);
  });

  test('shopkeeper visiting /admin/dashboard is redirected to /forbidden', async ({ page }) => {
    await loginAsShopkeeper(page);
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test('shopkeeper visiting /reports is redirected to /forbidden', async ({ page }) => {
    await loginAsShopkeeper(page);
    await page.goto('/reports');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test('shopkeeper visiting /employees is redirected to /forbidden', async ({ page }) => {
    await loginAsShopkeeper(page);
    await page.goto('/employees');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test('shopkeeper does NOT see Reports or Employees in sidebar', async ({ page }) => {
    await loginAsShopkeeper(page);
    await page.goto('/');
    // These links should be absent for non-admin roles
    await expect(page.getByRole('link', { name: /reports/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /employees/i })).toHaveCount(0);
  });

  // ── Employee ─────────────────────────────────────────────────────────────

  test('employee visiting /admin/dashboard is redirected to /forbidden', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/\/forbidden/);
  });

  // ── Logout ───────────────────────────────────────────────────────────────

  test('clearing auth state then visiting protected route redirects to /login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    // Now simulate logout by clearing storage and hard navigating
    await page.evaluate(() => localStorage.removeItem('pharma-storage'));
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Forbidden page ───────────────────────────────────────────────────────

  test('/forbidden page renders 403 content', async ({ page }) => {
    await loginAsShopkeeper(page);
    await page.goto('/forbidden');
    await expect(page.getByText(/403|Forbidden|Access Denied/i).first()).toBeVisible();
  });
});
