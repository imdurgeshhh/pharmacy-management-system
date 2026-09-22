/**
 * E2E Auth Helpers
 * ─────────────────────────────────────────────────────────────────────────────
 * The app uses Clerk for OAuth. Rather than automating real Clerk sign-in
 * (which requires network access and is flaky), we bypass it by directly
 * seeding the Zustand persist key (`pharma-storage`) into localStorage before
 * navigating. This is the canonical pattern for testing apps with external
 * identity providers.
 *
 * Clerk's own `isSignedIn` hook is mocked at the network/module layer in
 * Vitest; in Playwright we sidestep it by injecting pre-authenticated store
 * state and relying on ProtectedRoute reading from the store (not directly
 * from Clerk).
 *
 * NOTE: The app's ProtectedRoute reads from `useStore(state => state.user)`.
 *       ClerkAuthSync only *writes* to the store — it does NOT block renders
 *       if the store already has a valid user. So seeding localStorage is
 *       sufficient for E2E navigation tests.
 */

/** @param {import('@playwright/test').Page} page */
export async function loginAsAdmin(page) {
  await seedAuthState(page, {
    id: 1,
    name: 'Admin User',
    email: 'admin@pharmacare.test',
    username: 'admin',
    role: 'admin',
    token: 'e2e-admin-token',
  });
}

/** @param {import('@playwright/test').Page} page */
export async function loginAsShopkeeper(page) {
  await seedAuthState(page, {
    id: 2,
    name: 'Shop User',
    email: 'shop@pharmacare.test',
    username: 'shopkeeper',
    role: 'shopkeeper',
    token: 'e2e-shop-token',
  });
}

/** @param {import('@playwright/test').Page} page */
export async function loginAsEmployee(page) {
  await seedAuthState(page, {
    id: 3,
    name: 'Employee User',
    email: 'emp@pharmacare.test',
    username: 'employee',
    role: 'employee',
    token: 'e2e-emp-token',
  });
}

/**
 * Seeds the Zustand persist store directly into localStorage.
 * Must be called AFTER a page.goto so that storage is available.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} user
 */
async function seedAuthState(page, user) {
  // Navigate to the app first (storage origin must match app origin)
  await page.goto('/');

  await page.evaluate((userData) => {
    const storeValue = {
      state: { user: userData },
      version: 0,
    };
    localStorage.setItem('pharma-storage', JSON.stringify(storeValue));
  }, user);
}

/**
 * Clears auth state. Call in afterEach for clean test isolation.
 * @param {import('@playwright/test').Page} page
 */
export async function logout(page) {
  await page.evaluate(() => {
    localStorage.removeItem('pharma-storage');
  });
}

/**
 * Seeds admin state AND navigates to a specific path.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
export async function adminGoTo(page, path) {
  await loginAsAdmin(page);
  await page.goto(path);
}

/**
 * Seeds shopkeeper state AND navigates to a specific path.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
export async function shopkeeperGoTo(page, path) {
  await loginAsShopkeeper(page);
  await page.goto(path);
}
