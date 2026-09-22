'use strict';

/**
 * snapshots.api.test.js — Phase E: Versioning / Backward-Compatibility
 * ─────────────────────────────────────────────────────────────────────────────
 * Captures the SHAPE (field names + types) of every API response and stores
 * it in `tests/api/snapshots/<endpoint>.json`.
 *
 * On subsequent runs, the shape is compared against the stored snapshot.
 * Any removed or renamed field causes a test failure — this is our
 * backward-compatibility guard in the absence of API versioning.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createSupplier, createMedicine, createInventoryBatch, createCustomer, createWholesaleSale, createWholesalePurchase } = require('./helpers/factories');

const SNAP_DIR = path.join(__dirname, 'snapshots');
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });

function shapeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : { '[]': shapeOf(value[0]) };
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shapeOf(v)])
    );
  }
  return typeof value;
}

function assertShapeCompatible(actual, expected, path = '') {
  if (typeof expected !== 'object' || expected === null) return;
  for (const [key, expectedType] of Object.entries(expected)) {
    const fullPath = path ? `${path}.${key}` : key;
    assert.ok(key in actual,
      `Backward-compat BROKEN: field "${fullPath}" was removed or renamed. ` +
      `Expected by snapshot but not in current response.`
    );
    if (typeof expectedType === 'object' && expectedType !== null && !Array.isArray(expectedType)) {
      assertShapeCompatible(actual[key] || {}, expectedType, fullPath);
    }
  }
}

function saveSnapshot(name, shape) {
  fs.writeFileSync(
    path.join(SNAP_DIR, `${name}.json`),
    JSON.stringify(shape, null, 2)
  );
}

function loadSnapshot(name) {
  const file = path.join(SNAP_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function assertOrCreateSnapshot(name, actual) {
  const existing = loadSnapshot(name);
  const actualShape = shapeOf(actual);
  if (!existing) {
    saveSnapshot(name, actualShape);
    return;
  }
  assertShapeCompatible(actualShape, existing, name);
}

// ─────────────────────────────────────────────────────────────────────────────

test('Phase E: Versioning / Response Shape Snapshots', async (t) => {
  let seeded, supplier, medicine, invBatch, customer, wSale, wPurchase;

  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    seeded = await db.seed();
    supplier = await createSupplier();
    medicine = await createMedicine({ barcode: `SNAP-${Date.now()}` });
    invBatch = await createInventoryBatch({ medicine_id: medicine.id, supplier_id: supplier.id, stock_qty: 50 });
    customer = await createCustomer();
    wSale = await createWholesaleSale();
    wPurchase = await createWholesalePurchase();
    auth.asAdmin();
  });

  t.after(async () => { auth.clear(); await db.teardown(); });

  await t.test('snapshot: GET /health', async () => {
    auth.clear();
    const res = await request(app).get('/api/health').expect(200);
    assertOrCreateSnapshot('health.GET', res.body);
  });

  await t.test('snapshot: GET /inventory', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/inventory').expect(200);
    assertOrCreateSnapshot('inventory.GET_list', res.body);
  });

  await t.test('snapshot: GET /inventory/alerts', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/inventory/alerts').expect(200);
    assertOrCreateSnapshot('inventory.GET_alerts', res.body);
  });

  await t.test('snapshot: GET /customers', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/customers').expect(200);
    assertOrCreateSnapshot('customers.GET_list', res.body);
  });

  await t.test('snapshot: GET /customers/:id', async () => {
    auth.asAdmin();
    const res = await request(app).get(`/api/customers/${customer.id}`).expect(200);
    assertOrCreateSnapshot('customers.GET_single', res.body);
  });

  await t.test('snapshot: POST /customers', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/customers')
      .send({ name: 'Snap Customer', phone: `8800${Date.now().toString().slice(-6)}` })
      .expect(201);
    assertOrCreateSnapshot('customers.POST', res.body);
  });

  await t.test('snapshot: GET /suppliers', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/suppliers').expect(200);
    assertOrCreateSnapshot('suppliers.GET_list', res.body);
  });

  await t.test('snapshot: GET /suppliers/:id', async () => {
    auth.asAdmin();
    const res = await request(app).get(`/api/suppliers/${supplier.id}`).expect(200);
    assertOrCreateSnapshot('suppliers.GET_single', res.body);
  });

  await t.test('snapshot: GET /reports/dashboard', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/reports/dashboard').expect(200);
    assertOrCreateSnapshot('reports.GET_dashboard', res.body);
  });

  await t.test('snapshot: GET /reports/sales', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/reports/sales').expect(200);
    assertOrCreateSnapshot('reports.GET_sales', res.body);
  });

  await t.test('snapshot: GET /wholesale/sales', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/wholesale/sales').expect(200);
    assertOrCreateSnapshot('wholesale.GET_sales', res.body);
  });

  await t.test('snapshot: GET /wholesale/purchases', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/wholesale/purchases').expect(200);
    assertOrCreateSnapshot('wholesale.GET_purchases', res.body);
  });

  await t.test('snapshot: POST /wholesale/sales', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/wholesale/sales')
      .send({ medicine_name: 'Snap Med', quantity: 10, price_per_unit: 5, shopkeeper_name: 'Snap Shop' })
      .expect(201);
    assertOrCreateSnapshot('wholesale.POST_sales', res.body);
  });

  await t.test('snapshot: GET /store', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/store').expect(200);
    assertOrCreateSnapshot('store.GET', res.body);
  });

  await t.test('snapshot: GET /auth/employees', async () => {
    const res = await auth.withRole('admin',
      () => request(app).get('/api/auth/employees').expect(200));
    assertOrCreateSnapshot('auth.GET_employees', res.body);
  });

  await t.test('snapshot: POST /auth/clerk-sync', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .send({ email: `snapclerk@test.pharma`, full_name: 'Snap Clerk', username: `snapclerk` })
      .expect(201);
    assertOrCreateSnapshot('auth.POST_clerk_sync', res.body);
  });

  await t.test('snapshot: GET /purchases', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/purchases').expect(200);
    assertOrCreateSnapshot('purchases.GET_list', res.body);
  });

  await t.test('snapshot: GET /sales', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/sales').expect(200);
    assertOrCreateSnapshot('sales.GET_list', res.body);
  });

  await t.test('snapshot: GET /employees', async () => {
    const res = await auth.withRole('admin',
      () => request(app).get('/api/employees').expect(200));
    assertOrCreateSnapshot('employees.GET_list', res.body);
  });

  await t.test('snapshot: 401 error shape', async () => {
    auth.clear();
    const res = await request(app).get('/api/employees').expect(401);
    assertOrCreateSnapshot('errors.401', res.body);
    assert.ok(res.body.error, 'Error response must have error field');
  });

  await t.test('snapshot: 403 error shape', async () => {
    const res = await auth.withRole('shopkeeper',
      () => request(app).get('/api/auth/employees'));
    assert.equal(res.status, 403);
    assertOrCreateSnapshot('errors.403', res.body);
    assert.ok(res.body.error);
  });

  await t.test('snapshot: 404 error shape', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/customers/999999').expect(404);
    assertOrCreateSnapshot('errors.404', res.body);
    assert.ok(res.body.error);
  });
});
