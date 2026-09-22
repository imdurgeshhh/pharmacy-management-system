# UAT Plan — PharmaCare Pharmacy Management System

> **Version**: 1.0  
> **Prepared by**: Engineering Team  
> **Stakeholder Sign-off required before**: Production go-live  
> **Target environment**: Staging (mirror of production)

---

## 1. Scope

This UAT plan covers end-to-end business workflows for the PharmaCare Pharmacy Management System. It is written in plain business language. Each scenario includes acceptance criteria (Pass/Fail) and is mapped to a business role.

---

## 2. Test Roles & Credentials

| Role | Description | Access |
|------|-------------|--------|
| **Admin** | Pharmacy owner / manager | Full access: all pages including Reports, Employees |
| **Shopkeeper** | Counter staff | POS, Inventory, Purchases, Suppliers, Dashboard |
| **Employee** | Back-office staff | Same as Shopkeeper |

> All test accounts should be created in the Clerk staging environment before UAT begins.

---

## 3. UAT Scenarios

### Module 1: Authentication & Login

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-01 | Login with valid Clerk account | Navigate to app URL → Click "Sign In with Clerk" → Authenticate in Clerk modal | Any | User lands on the Dashboard `/` without error | ⬜ Pass / ❌ Fail | |
| UAT-02 | Admin sees admin navigation links | Login as Admin → Check sidebar | Admin | "Reports" and "Employees" links visible | ⬜ Pass / ❌ Fail | |
| UAT-03 | Shopkeeper does NOT see admin links | Login as Shopkeeper → Check sidebar | Shopkeeper | "Reports" and "Employees" links absent | ⬜ Pass / ❌ Fail | |
| UAT-04 | Access denied for non-admin on admin page | Login as Shopkeeper → Navigate to `/admin/dashboard` directly | Shopkeeper | Redirected to 403 Forbidden page | ⬜ Pass / ❌ Fail | |
| UAT-05 | Logout clears session | Login → Click Logout → Try visiting `/` | Any | Redirected to login page | ⬜ Pass / ❌ Fail | |

---

### Module 2: POS (Point of Sale)

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-06 | Search and add medicine to bill | Go to POS → Type medicine name → Select from dropdown | Shopkeeper | Medicine appears as a row in the bill | ⬜ Pass / ❌ Fail | |
| UAT-07 | Update quantity and see auto-calculated total | Add medicine → Change qty to 3 | Shopkeeper | Net amount = MRP × 3 (with GST) recalculated correctly | ⬜ Pass / ❌ Fail | |
| UAT-08 | Apply discount to line item | Add medicine → Set discount % | Shopkeeper | Discounted amount deducted from net total | ⬜ Pass / ❌ Fail | |
| UAT-09 | Fill customer details | Fill Name, Phone, Doctor, Prescription fields | Shopkeeper | Fields accept input without error | ⬜ Pass / ❌ Fail | |
| UAT-10 | Complete sale and generate invoice | Fill bill completely → Click Save Bill | Shopkeeper | Success confirmation shown; Print/Download invoice available | ⬜ Pass / ❌ Fail | |
| UAT-11 | GST number validation | Enter invalid GST format in customer GST field | Shopkeeper | Red error indicator shown; form does not allow save | ⬜ Pass / ❌ Fail | |
| UAT-12 | Print invoice | After saving bill → Click Download Invoice → Open PDF | Shopkeeper | PDF opens with correct line items, totals, GST, shop info | ⬜ Pass / ❌ Fail | |

---

### Module 3: Inventory Management

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-13 | View medicine list | Go to Inventory | Any | Medicine list displays with name, brand, category, stock | ⬜ Pass / ❌ Fail | |
| UAT-14 | Add new medicine | Click "Add Medicine" → Fill all required fields → Save | Admin / Shopkeeper | New medicine appears in list | ⬜ Pass / ❌ Fail | |
| UAT-15 | Edit existing medicine | Click Edit on any medicine → Change Brand Name → Save | Admin / Shopkeeper | Updated brand name appears in list | ⬜ Pass / ❌ Fail | |
| UAT-16 | Delete medicine | Click Delete → Confirm in modal | Admin | Medicine removed from list | ⬜ Pass / ❌ Fail | |
| UAT-17 | Out-of-stock indicator | View medicine with stock = 0 | Any | Visual out-of-stock badge or indicator shown | ⬜ Pass / ❌ Fail | |

---

### Module 4: Purchases (Stock Entry)

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-18 | Add purchase entry | Go to Purchases → Fill medicine name, batch, expiry, qty, MRP → Click Add | Any | Entry appears in purchase table with correct calculated totals | ⬜ Pass / ❌ Fail | |
| UAT-19 | Add multiple items | Add 3 different medicine rows | Any | All 3 rows visible; grand total correct | ⬜ Pass / ❌ Fail | |
| UAT-20 | Required field validation | Submit with empty medicine name | Any | Error shown; submission blocked | ⬜ Pass / ❌ Fail | |
| UAT-21 | Save purchase entry | Fill all rows → Click Save Purchase | Any | Success message shown; stock updated | ⬜ Pass / ❌ Fail | |
| UAT-22 | Clear all rows | Click "Clear All" → Confirm | Any | All rows removed; table shows empty state | ⬜ Pass / ❌ Fail | |

---

### Module 5: Suppliers & Wholesale

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-23 | View wholesale sales list | Go to Suppliers → Wholesale Sales tab | Any | List of sales with amount, date, buyer displayed | ⬜ Pass / ❌ Fail | |
| UAT-24 | Add wholesale sale | Click "Add Sale" → Fill all fields (valid GST) → Save | Any | New sale appears in list | ⬜ Pass / ❌ Fail | |
| UAT-25 | Invalid GST number rejected | Fill sale modal with invalid GST number | Any | Error shown on GST field; save blocked | ⬜ Pass / ❌ Fail | |
| UAT-26 | Delete wholesale sale | Click Delete on a sale → Confirm | Admin | Sale removed from list | ⬜ Pass / ❌ Fail | |
| UAT-27 | Switch to Supplier Directory | Click "Supplier Directory" tab | Any | Supplier cards/list displayed | ⬜ Pass / ❌ Fail | |
| UAT-28 | Add supplier | In Supplier Directory → Click Add Supplier → Fill form → Save | Any | New supplier appears in directory | ⬜ Pass / ❌ Fail | |
| UAT-29 | Export wholesale sales to Excel | Click Export → Excel | Admin | Excel file downloaded | ⬜ Pass / ❌ Fail | |
| UAT-30 | Export wholesale sales to PDF | Click Export → PDF | Admin | PDF file downloaded with all sale rows | ⬜ Pass / ❌ Fail | |

---

### Module 6: Employees (Admin Only)

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-31 | Admin sees Employees page | Navigate to `/employees` | Admin | Employee list displayed | ⬜ Pass / ❌ Fail | |
| UAT-32 | Shopkeeper blocked from Employees | Navigate to `/employees` | Shopkeeper | Redirected to 403 Forbidden | ⬜ Pass / ❌ Fail | |
| UAT-33 | Add new employee | Click "Add Employee" → Fill all required fields (name, phone, email, password) → Save | Admin | New employee in list | ⬜ Pass / ❌ Fail | |
| UAT-34 | Password mismatch blocked | Fill add employee with mismatched passwords | Admin | Error shown; save blocked | ⬜ Pass / ❌ Fail | |
| UAT-35 | Edit employee | Click Edit → Change qualification → Save | Admin | Updated qualification shown | ⬜ Pass / ❌ Fail | |
| UAT-36 | Delete employee | Click Delete → Confirm | Admin | Employee removed from list | ⬜ Pass / ❌ Fail | |

---

### Module 7: Reports (Admin Only)

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-37 | Admin sees Reports page | Navigate to `/reports` | Admin | Reports page with tabs displayed | ⬜ Pass / ❌ Fail | |
| UAT-38 | Shopkeeper blocked from Reports | Navigate to `/reports` | Shopkeeper | Redirected to 403 Forbidden | ⬜ Pass / ❌ Fail | |
| UAT-39 | Switch report tabs | Click each tab (Sales, Purchases, etc.) | Admin | Tab content changes without error | ⬜ Pass / ❌ Fail | |
| UAT-40 | Export report to Excel | Click Export → Excel on a populated report | Admin | Excel file downloaded; data matches displayed table | ⬜ Pass / ❌ Fail | |
| UAT-41 | Export report to PDF | Click Export → PDF | Admin | PDF downloaded with correct columns and rows | ⬜ Pass / ❌ Fail | |

---

### Module 8: Dashboard & General UX

| ID | Scenario | Steps | Role | Pass Criteria | Result | Notes |
|----|---------|-------|------|---------------|--------|-------|
| UAT-42 | Admin dashboard loads | Login as Admin → View default dashboard | Admin | Stats cards render (sales, inventory, etc.) | ⬜ Pass / ❌ Fail | |
| UAT-43 | Shop dashboard loads | Login as Shopkeeper → View dashboard | Shopkeeper | Shop-specific dashboard renders | ⬜ Pass / ❌ Fail | |
| UAT-44 | Dark mode toggle | Click dark mode toggle → Refresh page | Any | Dark mode persists after refresh | ⬜ Pass / ❌ Fail | |
| UAT-45 | Sidebar mobile navigation | On mobile (< 640px) → Tap hamburger | Any | Sidebar slides open; tap overlay to close | ⬜ Pass / ❌ Fail | |
| UAT-46 | Escape key closes modals | Open any modal → Press Esc | Any | Modal closes without saving | ⬜ Pass / ❌ Fail | |

---

## 4. Acceptance Criteria Summary

- **All Critical UAT scenarios** (UAT-01 through UAT-12, UAT-31 through UAT-41) must **Pass** for go-live.
- **≥ 90%** of all scenarios (41/46) must Pass.
- Any 🔴 Critical regression (auth bypass, data loss) blocks release regardless of overall pass rate.

---

## 5. Stakeholder Sign-off Matrix

| Stakeholder | Role | Scenario Groups | Sign-off Date | Signature |
|-------------|------|-----------------|---------------|-----------|
| Pharmacy Owner | Business Owner | All | | |
| Lead Developer | Engineering | All (technical) | | |
| QA Engineer | Quality | All | | |
| Counter Staff Representative | End User | UAT-06 to UAT-17 (POS, Inventory) | | |
| Admin Representative | End User | UAT-31 to UAT-41 (Employees, Reports) | | |

---

## 6. Defect Reporting

For any ❌ Fail during UAT:

1. Note the **UAT ID** and brief description.
2. Capture a **screenshot or screen recording**.
3. Open an issue in the project tracker with label `UAT-Defect`.
4. Classify severity (Critical / High / Medium / Low) using `REGRESSION_LOG.md` scale.
5. Assign to the responsible engineer for resolution before sign-off.
