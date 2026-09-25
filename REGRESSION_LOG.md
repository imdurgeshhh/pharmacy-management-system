# Regression Log — PharmaCare Pharmacy Management System

> **Format**: Each entry maps: Bug ID → Description → Root Cause → Test File → Line(s) → Status

---

## Active Regression Tests

| Bug ID | Severity | Description | Root Cause | Test File | Line(s) | Status |
|--------|----------|-------------|------------|-----------|---------|--------|
| REG-001 | 🔴 Critical | Clerk sync failure must fall back to `shopkeeper`, never `admin`. Backend error during `/auth/clerk-sync` was previously elevating role to `admin` when error handler accessed a stale cache. | `ClerkAuthSync` catch block set role from fallback that could read `admin` from stale `clerkUser.publicMetadata`. Fixed to hardcode `role: 'shopkeeper'`. | `frontend/src/__tests__/integration/authFlow.test.jsx` | Auth sync failure test | ✅ Covered |
| REG-002 | 🔴 Critical | `undefined` or `null` role in Zustand store must default to `'guest'`, not escalate. | `getRole()` in `useStore.js` used `user?.role` without `.toLowerCase()` fallback, so `null?.toLowerCase()` threw and left role as `undefined`. | `frontend/src/__tests__/integration/roleRouting.test.jsx` | Null/undefined role routing test | ✅ Covered |
| REG-003 | 🟡 High | Admin-only routes (`/admin/dashboard`, `/reports`, `/employees`) were momentarily accessible to shopkeepers during hydration before `ProtectedRoute` mounted. | Missing loading guard in `ProtectedRoute`. Fixed by checking `isLoaded` before rendering children. | `e2e/accessControl.spec.js` | shopkeeper → `/admin/dashboard` test | ✅ Covered |
| REG-004 | 🟡 High | `x-user-role` header on direct API calls was being honored by the frontend to override role. | Frontend was reading `x-user-role` from some response interceptor; removed entirely. Role is only set via `useStore`. | `frontend/src/config/__tests__/axios.test.js` | Response interceptor passthrough test | ✅ Covered |
| REG-005 | 🟠 Medium | Wildcard routes (unknown URLs) were previously rendering a blank page instead of redirecting to `/forbidden`. | Missing `path="*"` catch-all in `App.jsx` routes. | `e2e/accessControl.spec.js` | unknown route → `/forbidden` test | ✅ Covered |
| REG-006 | 🟠 Medium | `PurchaseItemsTable` "Clear All" button had a collision with a same-named button in the delete confirmation modal, causing `getByRole` in tests to throw. | Fixed by scoping button lookup to the modal container via `modal.querySelector`. | `frontend/src/components/purchases/__tests__/PurchaseItemsTable.test.jsx` | "Clear All" button test | ✅ Covered |
| REG-008 | 🟡 High | "Units per Strip" pack size field was blocked as a read-only Catalog badge during stock entry, preventing users from setting pack sizes on new medicines or zero-stock catalog items. | Purchases form locked the field based on `form.is_new` which defaulted to `false` in `useStore.js` and was `false` for catalog items regardless of stock. Fixed in `Purchases.jsx` and `Inventory.jsx` to lock ONLY when `medicine_id && activeStock > 0`. | `frontend/src/__tests__/integration/purchasesFlow.test.jsx`, `backend/tests/api/inventory.api.test.js` | lines 164-219 (`purchasesFlow.test.jsx`), lines 158-202 (`inventory.api.test.js`) | ✅ Covered |
| REG-009 | 🟡 High | POS billing previously billed medicines at cost or raw purchase price because Purchases form only had Purchase Price, overwriting `mrp`. | Added dedicated `selling_price` to `INVENTORY` and `PURCHASE_ITEMS`. Purchases form now pairs `Units per Strip` + `Qty (Tablets)` and `Purchase Price` + `Selling Price`. POS billing, receipts, and invoices strictly prioritize `selling_price` (fallback: `selling_price ?? mrp ?? purchase_price`). | `backend/tests/api/strip_loose_billing.api.test.js`, `frontend/src/__tests__/integration/purchasesFlow.test.jsx`, `frontend/src/__tests__/integration/posFlow.test.jsx` | All POS & Purchase suites | ✅ Covered |

---

## Pending / Investigated

| Bug ID | Severity | Description | Status | Owner |
|--------|----------|-------------|--------|-------|
| REG-007 | 🟠 Medium | localStorage not initializing in Node 25 jsdom env; `MemoryStorage` polyfill required in `setupStorage.js`. Impacts all store-dependent component tests. | ✅ Fixed via `setupStorage.js` | — |

---

## Adding New Regressions

When a bug is discovered and fixed, add a row:

1. Assign next `REG-NNN` ID.
2. Set **Severity**: 🔴 Critical / 🟡 High / 🟠 Medium / 🟢 Low.
3. Describe the **root cause**, not just the symptom.
4. Link to the **test file and line** that prevents recurrence.
5. Set **Status** to `✅ Covered` once a test is in place, `🚧 Pending Test` otherwise.

---

## Severity Definitions

| Severity | Meaning |
|----------|---------|
| 🔴 Critical | Security vulnerability, data loss, or total auth bypass |
| 🟡 High | Core business flow broken (POS checkout, purchases, reports inaccessible) |
| 🟠 Medium | UI broken or degraded but workaround exists |
| 🟢 Low | Cosmetic issue or minor UX regression |
