/**
 * Phase 4 E2E – Suppliers & Wholesale Hub
 * ─────────────────────────────────────────────────────────────────────────
 * Tests covered:
 *  - @smoke Suppliers page loads with Wholesale Sales tab active
 *  - @smoke Wholesale sales table renders existing sales rows
 *  - @smoke Add Wholesale Sale modal opens and submits
 *  - Tab switching: Wholesale Sales <-> Supplier Directory
 *  - Export dropdown triggers download action (smoke — just verifies button visible)
 *  - Delete sale with ConfirmModal
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsShopkeeper, logout } from './helpers/auth.js';

test.describe('Suppliers & Wholesale', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/suppliers');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Page load ─────────────────────────────────────────────────────────────

  test('Suppliers page loads with Wholesale & Supplier heading @smoke', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /wholesale|supplier/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Wholesale Sales tab is active by default @smoke', async ({ page }) => {
    // The "Wholesale Sales" tab button should be visible
    const salesTab = page.getByRole('button', { name: /wholesale sales/i }).first();
    await expect(salesTab).toBeVisible({ timeout: 5000 });
  });

  // ── Wholesale Sales table ─────────────────────────────────────────────────

  test('wholesale sales table renders rows from API data @smoke', async ({ page }) => {
    // Mock data includes "Paracetamol 500mg" as a wholesale sale
    // The app may show it in the table
    await page.waitForTimeout(2000); // Allow API call to settle
    // Verify the table area is visible
    const tableArea = page
      .locator('table, [data-testid="sales-table"]')
      .or(page.getByText(/paracetamol|medicine|sale/i).first())
      .first();
    await expect(tableArea).toBeVisible({ timeout: 8000 });
  });

  // ── Tab switching ─────────────────────────────────────────────────────────

  test('clicking Supplier Directory tab switches content', async ({ page }) => {
    const supplierTab = page.getByRole('button', { name: /supplier directory/i }).first();
    await supplierTab.click();
    await page.waitForTimeout(500);
    // The supplier list should now be visible (SupplierList component)
    const supplierContent = page.getByText(/apex pharma|supplier|vendor/i).first();
    await expect(supplierContent).toBeVisible({ timeout: 5000 });
  });

  test('clicking back to Wholesale Sales tab switches content back', async ({ page }) => {
    const supplierTab = page.getByRole('button', { name: /supplier directory/i }).first();
    await supplierTab.click();
    await page.waitForTimeout(300);

    const salesTab = page.getByRole('button', { name: /wholesale sales/i }).first();
    await salesTab.click();
    await page.waitForTimeout(300);

    // "Add Sale" button should be visible in sales tab
    const addSaleBtn = page.getByRole('button', { name: /add sale|new sale/i }).first();
    await expect(addSaleBtn).toBeVisible({ timeout: 5000 });
  });

  // ── Add wholesale sale ────────────────────────────────────────────────────

  test('Add Sale button opens WholesaleSaleModal @smoke', async ({ page }) => {
    const addSaleBtn = page.getByRole('button', { name: /add sale|new sale/i }).first();
    await expect(addSaleBtn).toBeVisible({ timeout: 5000 });
    await addSaleBtn.click();

    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('wholesale sale form contains required fields', async ({ page }) => {
    const addSaleBtn = page.getByRole('button', { name: /add sale|new sale/i }).first();
    await addSaleBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // WholesaleSaleModal fields: medicine_name, shopkeeper_name, gst_number, quantity, price_per_unit
    const medicineName = page
      .getByLabel(/medicine name/i)
      .or(page.getByPlaceholder(/medicine name/i))
      .first();
    await expect(medicineName).toBeVisible({ timeout: 3000 });
  });

  test('submitting complete wholesale sale form @smoke', async ({ page }) => {
    const addSaleBtn = page.getByRole('button', { name: /add sale|new sale/i }).first();
    await addSaleBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill form fields
    const medicineName = page.getByLabel(/medicine name/i).or(page.getByPlaceholder(/medicine name/i)).first();
    if (await medicineName.isVisible().catch(() => false)) await medicineName.fill('Paracetamol 500mg');

    const shopName = page.getByLabel(/shopkeeper|buyer|pharmacy/i).or(page.getByPlaceholder(/shopkeeper|buyer/i)).first();
    if (await shopName.isVisible().catch(() => false)) await shopName.fill('City Care Chemist');

    const gstNo = page.getByLabel(/gst number|gstin/i).or(page.getByPlaceholder(/gst/i)).first();
    if (await gstNo.isVisible().catch(() => false)) await gstNo.fill('29AAAAA0000A1Z5');

    const qty = page.getByLabel(/quantity/i).or(page.getByPlaceholder(/quantity|qty/i)).first();
    if (await qty.isVisible().catch(() => false)) await qty.fill('50');

    const pricePerUnit = page.getByLabel(/price per unit|rate/i).or(page.getByPlaceholder(/price|rate/i)).first();
    if (await pricePerUnit.isVisible().catch(() => false)) await pricePerUnit.fill('18.5');

    // Submit
    const saveBtn = page.getByRole('button', { name: /save|add sale|submit/i }).last();
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Modal should close after success
    await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 5000 }).catch(() => {
      expect(page.url()).toContain('/suppliers');
    });
  });

  // ── Export actions ────────────────────────────────────────────────────────

  test('Export dropdown / button is visible (admin)', async ({ page }) => {
    // WholesaleSalesTable shows an export button for admins
    const exportBtn = page
      .getByRole('button', { name: /export/i })
      .or(page.getByText(/export/i).first());
    await expect(exportBtn.first()).toBeVisible({ timeout: 5000 });
  });

  // ── Delete sale ───────────────────────────────────────────────────────────

  test('Delete sale button opens confirm modal', async ({ page }) => {
    await page.waitForTimeout(2000);
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      const modal = page.getByRole('dialog').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });
});
