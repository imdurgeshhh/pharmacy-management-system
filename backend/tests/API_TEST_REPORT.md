# API Test Report — Pharma Backend

**Generated:** 2026-09-21  
**Coverage:** 46 endpoints across 12 modules  
**Test Runner:** Node.js built-in `node:test` + Supertest  
**Newman:** Postman collection (10 folders, 30+ requests)  

---

## How to Run

```bash
cd backend

# 1. Set up test DB (once)
node -e "
  require('./tests/api/helpers/testApp');
  const db = require('./tests/api/helpers/dbHelper');
  db.setupSchema().then(() => { console.log('Schema ready'); db.teardown(); });
"

# 2. Full suite
npm run test:api

# 3. Contract tests only
npm run test:contract

# 4. Snapshot baseline (first run creates, subsequent runs assert)
node --test tests/api/snapshots.api.test.js

# 5. Newman (against running dev server)
npm run dev &
npm run test:newman
```

---

## Coverage Table

| Module | Endpoints | Test File | Test Cases |
|--------|-----------|-----------|------------|
| health | 1 | `health.api.test.js` | 1 |
| auth | 2 | `auth.api.test.js` | 8 |
| customers | 5 | `customers.api.test.js` | 14 |
| employees | 5 | `employees.api.test.js` | 16 |
| inventory | 6 | `inventory.api.test.js` | 14 |
| ocr | 1 | `ocr.api.test.js` | 4 |
| purchases | 5 | `purchases.api.test.js` | 12 |
| reports | 2 | `reports.api.test.js` | 7 |
| sales | 7 | `sales.api.test.js` | 16 |
| store | 1 | `store.api.test.js` | 4 |
| suppliers | 5 | `suppliers.api.test.js` | 14 |
| wholesale | 6 | `wholesale.api.test.js` | 15 |
| snapshots (Phase E) | all | `snapshots.api.test.js` | 21 |
| rate limit (Phase D) | 2 | `ratelimit.api.test.js` | 6 (all TODO) |
| **Total** | **46** | **15 files** | **~152** |

---

## Bug Report

All bugs were discovered during Step 1 (Reconnaissance) by reading the routes and controllers, **before** running any tests. No bugs were introduced by the test suite.

| ID | Severity | Module | Description | Test |
|----|---------|--------|-------------|------|
| **BUG-01** | 🔴 CRITICAL | All | **37 of 46 endpoints have no authentication.** Customers, purchases, sales, inventory (create/update), reports, suppliers (read/create/update), and wholesale (read/create) are fully public — no Clerk token required. | Every test file |
| **BUG-02** | 🟠 HIGH | tests | `security.test.js` imports `generateToken` and `JWT_SECRET` from `middleware/auth.js` — those exports do not exist. The existing tests are broken and silently skipped. | `security.test.js` (untouched) |
| **BUG-03** | 🟡 MEDIUM | inventory | `DELETE /inventory/medicine/:id` returns `200 { message }` even for non-existent IDs. The controller has no 404 check. | `inventory.api.test.js` |
| **BUG-04** | 🟡 MEDIUM | multiple | Error responses in `purchaseController.js` and `inventoryController.js` return `error.message` directly, which can expose raw SQL, file paths, or stack details to the client. | All test files assert no stack trace |
| **BUG-05** | 🟡 MEDIUM | ocr | `POST /ocr/scan` has no authentication, no file type validation, and no file size limit. Multer accepts any file. | `ocr.api.test.js` |
| **BUG-06** | 🟡 MEDIUM | employees | `PUT /employees/:id` has no role check beyond `authenticateToken` — any authenticated user (shopkeeper, employee) can update any employee record including admins. | `employees.api.test.js` |
| **BUG-07** | 🟢 LOW | customers | `POST /customers` — missing `name` field hits the DB `NOT NULL` constraint and returns a raw 500 instead of a clean 400. The controller performs no input validation. | `customers.api.test.js` |
| **BUG-08** | 🟠 HIGH | sales, purchases, wholesale | No idempotency guard. Double-submitting `POST /sales` or `POST /purchases` creates duplicate records and double-deducts/adds inventory. Concurrent requests are especially dangerous. | `sales.api.test.js`, `purchases.api.test.js`, `wholesale.api.test.js` |

---

## MSW Mock Drift (Frontend Impact)

The following divergences exist between `frontend/src/mocks/handlers.js` and the real API responses. These mean the frontend tests pass with the mock but may fail against the real backend.

| Endpoint | MSW says | Real API returns | Impact |
|----------|---------|-----------------|--------|
| `POST /auth/clerk-sync` | `{ success: true, user: { ..., token: '...' } }` | `{ message, user: {...} }` — no `success`, no `token` | HIGH |
| `POST /sales` | `{ success: true, sale_id, bill_no, total }` | `{ message, saleId, invoiceNo }` | HIGH |
| `POST /purchases` | `{ success: true, purchase_id, items_count }` | `{ message, purchaseId }` | HIGH |
| `POST /inventory` (wrong path) | Mocked at `/inventory` | Real create path is `/inventory/medicine` | HIGH |
| `DELETE /inventory/:id` | `{ success: true, id }` | `{ message }` | MEDIUM |
| `DELETE /suppliers/:id` | `{ success: true, id }` | `{ message, supplier: {...} }` | MEDIUM |
| `DELETE /wholesale/sales/:id` | `{ success: true, id }` | `{ message }` | MEDIUM |

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Test Foundation | ✅ Done |
| B | Contract / Schema (`openapi.yaml`) | ✅ Done |
| C | Status Codes, Errors, Edge Cases | ✅ Done |
| D | Rate Limiting | ⏳ Stubs written — awaiting approval to implement `express-rate-limit` |
| E | Versioning / Backward-Compat Snapshots | ✅ Done |
| F | Idempotency | ✅ Done (embedded in Phase C tests as BUG-08 assertions) |
| G | Newman / Postman | ✅ Done |

---

## File Inventory

```
backend/
├── .env.test                              NEW — test DB env (fill in DB_PASSWORD)
├── .env.test.example                      NEW — safe to commit
├── openapi.yaml                           NEW — full 46-endpoint OpenAPI 3.0.3 spec
├── server.js                              MODIFIED — 3-line change: guard listen + export app
├── package.json                           MODIFIED — test:api, test:contract, test:newman scripts
├── postman/
│   ├── pharma.collection.json             NEW — 10 folders, 30+ requests, test scripts
│   └── pharma.environment.json            NEW — BASE_URL + ADMIN_TOKEN
└── tests/
    ├── security.test.js                   UNTOUCHED
    └── api/
        ├── helpers/
        │   ├── testApp.js                 NEW — env load, Clerk mock, app export
        │   ├── authHelper.js              NEW — asAdmin/asShopkeeper/asEmployee/withRole
        │   ├── dbHelper.js                NEW — setupSchema/resetDb/seed/teardown
        │   └── factories.js               NEW — 8 factory functions
        ├── health.api.test.js             NEW — smoke test
        ├── auth.api.test.js               NEW — 8 tests
        ├── customers.api.test.js          NEW — 14 tests
        ├── employees.api.test.js          NEW — 16 tests
        ├── inventory.api.test.js          NEW — 14 tests
        ├── ocr.api.test.js                NEW — 4 tests
        ├── purchases.api.test.js          NEW — 12 tests
        ├── reports.api.test.js            NEW — 7 tests
        ├── sales.api.test.js              NEW — 16 tests
        ├── store.api.test.js              NEW — 4 tests
        ├── suppliers.api.test.js          NEW — 14 tests
        ├── wholesale.api.test.js          NEW — 15 tests
        ├── snapshots.api.test.js          NEW — 21 shape-snapshot tests
        └── ratelimit.api.test.js          NEW — 6 stubs (Phase D, awaiting approval)
```

---

## Security Recommendations (Prioritised)

1. **[CRITICAL] Add `authenticateToken` to all write operations** (customers, purchases, sales, wholesale). Reads may remain public if acceptable by business requirements.
2. **[HIGH] Fix `security.test.js`** — remove import of non-existent `generateToken`/`JWT_SECRET` or rewrite to use Clerk mock strategy.
3. **[HIGH] Add idempotency to `POST /sales` and `POST /purchases`** — an `Idempotency-Key` header checked against a short-lived cache (Redis or DB table) prevents duplicate invoices and stock double-deductions.
4. **[MEDIUM] Fix `DELETE /inventory/medicine/:id`** — add a row-count check and return 404 when no rows were deleted.
5. **[MEDIUM] Restrict `PUT /employees/:id` to admin or self-edit** — currently any authenticated user can rewrite any employee's profile.
6. **[MEDIUM] Normalise error responses** — wrap all `catch` handlers to return `{ error: string }` without leaking `error.message` directly.
7. **[MEDIUM] Add auth + file validation to `POST /ocr/scan`** — at minimum require authentication and validate `image/jpeg` or `image/png` MIME type.
8. **[LOW] Validate `name` in `POST /customers`** — return `{ error: 'name is required' }` (400) instead of relying on DB constraint for a 500.
