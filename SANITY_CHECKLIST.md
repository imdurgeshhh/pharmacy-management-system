# Sanity Checklist — PharmaCare Pharmacy Management System

> **Purpose**: A fast, structured verification matrix for hotfixes, patches, and feature drops. Run before every production deployment. Each engineer signs off on the relevant rows. Target completion time: **< 20 minutes**.

---

## How to Use

1. Copy this checklist into your PR/deployment ticket.
2. Check off each row as you verify it.
3. For any ❌ Fail — block deployment and open a bug ticket.
4. Attach automated test output where applicable.

---

## Section A — Critical Path (Run Every Deployment)

| # | Area | Verification | Command / Steps | Result | Notes |
|---|------|-------------|-----------------|--------|-------|
| A1 | Auth | Unauthenticated visit to `/` redirects to `/login` | `npx playwright test e2e/auth.spec.js --grep "unauthenticated"` | ⬜ Pass / ❌ Fail | |
| A2 | Auth | Admin login → can reach `/admin/dashboard` | `npx playwright test e2e/auth.spec.js --grep "admin"` | ⬜ Pass / ❌ Fail | |
| A3 | Auth | Shopkeeper blocked from `/admin/dashboard` → `/forbidden` | `npx playwright test e2e/accessControl.spec.js --grep "shopkeeper"` | ⬜ Pass / ❌ Fail | |
| A4 | POS | POS page loads and medicine search returns results | `npx playwright test e2e/pos.spec.js --grep "search"` | ⬜ Pass / ❌ Fail | |
| A5 | POS | Checkout roundtrip completes without error | `npx playwright test e2e/pos.spec.js --grep "roundtrip"` | ⬜ Pass / ❌ Fail | |
| A6 | Inventory | Add medicine modal opens and saves | `npx playwright test e2e/inventory.spec.js --grep "Add"` | ⬜ Pass / ❌ Fail | |
| A7 | Unit/Component | All Vitest tests pass | `cd frontend && npm run test` | ⬜ Pass / ❌ Fail | |
| A8 | Coverage | `utils/` and `store/` branch/line coverage ≥ 70% | `cd frontend && npm run test:coverage` | ⬜ Pass / ❌ Fail | |

---

## Section B — Feature-Specific (Run When Relevant Area Is Touched)

| # | Area Touched | Tests to Re-run | Expected Outcome | Result | Notes |
|---|-------------|----------------|-----------------|--------|-------|
| B1 | Auth / Clerk sync | `e2e/auth.spec.js`, `src/__tests__/integration/authFlow.test.jsx` | All auth flows pass, sync failure defaults to shopkeeper | ⬜ | |
| B2 | Role Guard / routing | `e2e/accessControl.spec.js`, `src/components/__tests__/RoleGuard.test.jsx`, `src/__tests__/integration/roleRouting.test.jsx` | Admin-only routes blocked for non-admins | ⬜ | |
| B3 | POS / Cart | `e2e/pos.spec.js`, `src/__tests__/integration/posFlow.test.jsx`, `src/store/__tests__/useStore.test.js` | Cart add/remove/clear + full checkout | ⬜ | |
| B4 | Inventory CRUD | `e2e/inventory.spec.js` | Add/Edit/Delete inventory items with modal | ⬜ | |
| B5 | Purchases | `e2e/purchases.spec.js`, `src/__tests__/integration/purchasesFlow.test.jsx` | Multi-line entry, validation, submission | ⬜ | |
| B6 | Suppliers / Wholesale | `e2e/suppliers.spec.js`, `src/__tests__/integration/suppliersWholesaleFlow.test.jsx` | Sale modal, tab switching, delete | ⬜ | |
| B7 | Reports | `e2e/reports.spec.js`, `src/__tests__/integration/exportIntegration.test.jsx` | Tab navigation, export buttons, download | ⬜ | |
| B8 | Employees | `e2e/employees.spec.js` | Admin CRUD, non-admin blocked | ⬜ | |
| B9 | Export (Excel/PDF) | `src/utils/__tests__/exportData.test.js`, `src/utils/__tests__/receiptPrinter.test.js` | Column mapping, GST calc, special chars | ⬜ | |
| B10 | Axios interceptors | `src/config/__tests__/axios.test.js` | Auth header attached, 401 triggers logout | ⬜ | |

---

## Section C — Regression Safety (Run Before Every Release)

| # | Regression | Test | Result | Notes |
|---|-----------|------|--------|-------|
| R1 | Sync failure falls back to shopkeeper (never admin) | `src/__tests__/regression/authSecurityRegression.test.jsx` | ⬜ | |
| R2 | Undefined/null role never grants admin | `e2e/accessControl.spec.js` — "undefined role" tests | ⬜ | |
| R3 | Direct URL bypass blocked at ProtectedRoute | `e2e/accessControl.spec.js` — parameterized routes | ⬜ | |
| R4 | Wild-card unknown routes → /forbidden | `e2e/accessControl.spec.js` — "unknown route" test | ⬜ | |

---

## Section D — Manual Spot-Checks

| # | Check | Steps | Result | Notes |
|---|-------|-------|--------|-------|
| M1 | Dark mode toggle persists | Toggle dark mode, refresh — mode retained | ⬜ | |
| M2 | Sidebar opens on mobile (< 640px) | Resize browser to 375px wide, click hamburger | ⬜ | |
| M3 | Escape key closes every modal | Open each modal, press Esc | ⬜ | |
| M4 | Print invoice renders correct GST | Create POS sale with GST filled, click Download | ⬜ | |
| M5 | Out-of-stock item shows warning in POS | Search for Cetirizine (stock=0), verify warning | ⬜ | |

---

## Hotfix / Patch SOP

1. **Identify affected component** (which page/component was changed).
2. **Run section A** (always).
3. **Run matching section B rows** for the affected area.
4. **Run section C** if the fix touches auth, routing, or role logic.
5. **Sign off** and attach CI logs to the PR.

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |
| QA Lead | | | |
