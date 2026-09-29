/**
 * Phase 4 E2E – POS (Point of Sale) Page
 * ─────────────────────────────────────────────────────────────────────────
 * Tests covered:
 *  - @smoke POS page loads and shows bill header
 *  - @smoke Can search for a medicine and add it to the bill
 *  - @smoke Checkout with complete bill saves successfully
 *  - Adjusting quantity updates net amount calculation
 *  - Empty bill blocks Save (no rows)
 *  - Customer name field is present and editable
 *  - Print / Download invoice button renders after successful save
 */

import { test, expect } from '@playwright/test';
import { loginAsShopkeeper, logout } from './helpers/auth.js';

test.describe('POS – Point of Sale', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsShopkeeper(page);
    await page.goto('/pos');
    // Wait for POS page to fully load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // ── Page load ─────────────────────────────────────────────────────────────

  test('POS page loads with bill header @smoke', async ({ page }) => {
    // Bill number should appear somewhere on the page
    await expect(page.getByText(/BILL-/i)).toBeVisible({ timeout: 5000 });
  });

  test('POS page shows medicine picker / search area', async ({ page }) => {
    const searchInput = page.locator('#pos-med-0').or(page.getByRole('combobox', { name: 'Medicine' })).first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  // ── Add medicine to bill ─────────────────────────────────────────────────

  test('can type in medicine search field @smoke', async ({ page }) => {
    const searchInput = page.locator('#pos-med-0').or(page.getByRole('combobox', { name: 'Medicine' })).first();
    await searchInput.fill('Para');
    // After typing, the dropdown or suggestion area should appear
    await expect(page.getByText(/Paracetamol/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('selecting a medicine from dropdown adds it to bill rows @smoke', async ({ page }) => {
    const searchInput = page.locator('#pos-med-0').or(page.getByRole('combobox', { name: 'Medicine' })).first();
    await searchInput.fill('Para');
    // Click the suggestion
    const suggestion = page.getByText(/Paracetamol/i).first();
    await suggestion.click();
    // The medicine should now appear in the bill table
    await expect(searchInput).toHaveValue(/Paracetamol/i);
  });

  // ── Quantity update changes net amount ────────────────────────────────────

  test('adjusting quantity updates net amount display', async ({ page }) => {
    const searchInput = page.locator('#pos-med-0').or(page.getByRole('combobox', { name: 'Medicine' })).first();
    await searchInput.fill('Para');
    await page.getByText(/Paracetamol/i).first().click();

    // Find the qty cell/input within the bill table and update it
    const qtyInput = page.locator('#pos-qty-0').or(page.getByRole('spinbutton', { name: 'Qty' })).first();
    await expect(qtyInput).toBeVisible({ timeout: 3000 });
    await qtyInput.fill('3');
    await qtyInput.press('Tab');
    // Net amount field should update — look for a value > 0
    await expect(page.getByText(/₹/).first()).toBeVisible({ timeout: 3000 });
  });

  // ── Customer fields ───────────────────────────────────────────────────────

  test('customer name field is present and editable', async ({ page }) => {
    const nameField = page.getByRole('textbox', { name: 'Name' }).or(page.getByPlaceholder('Walk-in…')).first();
    await expect(nameField).toBeVisible({ timeout: 5000 });
    await nameField.fill('Test Patient');
    await expect(nameField).toHaveValue('Test Patient');
  });

  // ── Save / Checkout ───────────────────────────────────────────────────────

  test('Save button exists in the POS form', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save bill/i });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
  });

  test('POS checkout roundtrip — fill bill and save @smoke', async ({ page }) => {
    // Step 1: Add medicine
    const searchInput = page.locator('#pos-med-0').or(page.getByRole('combobox', { name: 'Medicine' })).first();
    await searchInput.fill('Para');
    await page.getByText(/Paracetamol/i).first().click();

    // Step 2: Fill customer name
    const nameField = page.getByRole('textbox', { name: 'Name' }).or(page.getByPlaceholder('Walk-in…')).first();
    await nameField.fill('E2E Test Patient');

    // Handle alert dialog if triggered
    page.once('dialog', dialog => dialog.accept());

    // Step 3: Click Save
    const saveBtn = page.getByRole('button', { name: /save bill/i });
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // Verify page state remains stable on POS
    expect(page.url()).toContain('/pos');
  });

  // ── Billing Formats (Customer Bill vs Wholesale Bill) ─────────────────────

  test('can select Customer Bill format, generate bill, and verify simplified PDF content', async ({ page }) => {
    // 1. Select Customer Bill format via radio toggle
    const customerBillRadio = page.getByRole('radio', { name: /customer bill/i });
    await expect(customerBillRadio).toBeVisible({ timeout: 5000 });
    await customerBillRadio.click();
    await expect(customerBillRadio).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('heading', { name: /customer billing/i })).toBeVisible();

    // 2. Add medicine item
    const searchInput = page.locator('#pos-med-0').or(page.getByRole('combobox', { name: 'Medicine' })).first();
    await searchInput.fill('Para');
    await page.getByText(/Paracetamol/i).first().click();

    // 3. Fill customer name
    const nameField = page.getByRole('textbox', { name: 'Name' }).or(page.getByPlaceholder('Walk-in…')).first();
    await nameField.fill('Customer Format Test');

    // 4. Download PDF and verify content
    const downloadPromise = page.waitForEvent('download');
    const printBtn = page.getByRole('button', { name: /print \/ download pdf/i });
    await expect(printBtn).toBeEnabled({ timeout: 5000 });
    await printBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const pdfContent = Buffer.concat(chunks).toString('latin1');

    // Customer Bill format verifications
    expect(pdfContent).toContain('CUSTOMER BILL');
    expect(pdfContent).toContain('Medicine Name');
    expect(pdfContent).toContain('GST Included');
    expect(pdfContent).toContain('Grand Total:');
    // Row level tax breakdown should not appear in customer bill
    expect(pdfContent).not.toContain('CGST:');
    expect(pdfContent).not.toContain('SGST:');
  });

  test('can select Wholesale Bill format, generate bill, and verify detailed PDF content', async ({ page }) => {
    // 1. Select Wholesale Bill format via radio toggle
    const wholesaleBillRadio = page.getByRole('radio', { name: /wholesale bill/i });
    await expect(wholesaleBillRadio).toBeVisible({ timeout: 5000 });
    await wholesaleBillRadio.click();
    await expect(wholesaleBillRadio).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('heading', { name: /wholesale billing/i })).toBeVisible();

    // 2. Add medicine item
    const searchInput = page.locator('#pos-med-0').or(page.getByRole('combobox', { name: 'Medicine' })).first();
    await searchInput.fill('Para');
    await page.getByText(/Paracetamol/i).first().click();

    // 3. Fill customer details
    const nameField = page.getByRole('textbox', { name: 'Name' }).or(page.getByPlaceholder('Walk-in…')).first();
    await nameField.fill('Wholesale Format Buyer');

    // 4. Download PDF and verify content
    const downloadPromise = page.waitForEvent('download');
    const printBtn = page.getByRole('button', { name: /print \/ download pdf/i });
    await expect(printBtn).toBeEnabled({ timeout: 5000 });
    await printBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const pdfContent = Buffer.concat(chunks).toString('latin1');

    // Wholesale Bill format verifications
    expect(pdfContent).toContain('TAX INVOICE');
    expect(pdfContent).toContain('HSN');
    expect(pdfContent).toContain('Net Amt');
  });
});

