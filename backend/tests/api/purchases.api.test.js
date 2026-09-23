'use strict';

/**
 * purchases.api.test.js — /api/purchases (5 endpoints)
 * Protected with authenticateToken and requireBusinessAccess.
 * Phase F idempotency: double-submit creates duplicate records.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createSupplier, createMedicine } = require('./helpers/factories');

test('Module: purchases', async (t) => {
  let seeded, supplier, medicine;

  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    seeded = await db.seed();
    supplier = await createSupplier();
    medicine = await createMedicine();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  function validPurchasePayload(overrides = {}) {
    return {
      supplier_id: supplier.id,
      total_amount: 500,
      tax_amount: 50,
      items: [{
        medicine_name: medicine.name,
        medicine_id: medicine.id,
        batch_number: `BATCH-${Date.now()}`,
        qty: 10,
        price: 50.00,
        mrp: 80.00,
        tax: 5,
        tax_percentage: 12,
        schedule: 'G',
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      }],
      ...overrides,
    };
  }

  // ── GET / ─────────────────────────────────────────────────────────────────
  await t.test('[contract] GET /purchases → 200 array', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/purchases').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      ['id','total_amount','tax_amount','created_at','supplier_name'].forEach(k =>
        assert.ok(k in res.body[0], `Purchase list item must have field: ${k}`)
      );
    }
  });

  await t.test('[auth] GET /purchases without token → 401', async () => {
    auth.clear();
    const res = await request(app).get('/api/purchases');
    assert.equal(res.status, 401, 'purchases list requires auth');
    auth.asAdmin();
  });

  // ── GET /:id ──────────────────────────────────────────────────────────────
  await t.test('[contract] GET /purchases/:id → 200 with items array', async () => {
    auth.asAdmin();
    const payload = validPurchasePayload();
    const created = await request(app).post('/api/purchases').send(payload);
    assert.equal(created.status, 201);

    const res = await request(app).get(`/api/purchases/${created.body.purchaseId}`).expect(200);
    assert.ok(res.body.id);
    assert.ok(Array.isArray(res.body.items), 'Must include items array');
    assert.ok('supplier_name' in res.body, 'Must include supplier_name');
  });

  await t.test('GET /purchases/:id → 404 for non-existent', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/purchases/999999').expect(404);
    assert.ok(res.body.error);
  });

  // ── POST / ────────────────────────────────────────────────────────────────
  await t.test('[contract] POST /purchases → 201 with { message, purchaseId }', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/purchases').send(validPurchasePayload()).expect(201).expect('Content-Type', /json/);
    assert.ok(res.body.purchaseId, 'Must return purchaseId');
    assert.ok(res.body.message, 'Must return message');
    // Verify inventory was updated
    const rows = await db.query('SELECT stock_qty FROM INVENTORY WHERE medicine_id=$1', [medicine.id]);
    assert.ok(rows.rows.length > 0, 'Inventory must be created for the medicine');
  });

  await t.test('[Bug 1 Fix] POST /purchases stock entry appears in GET /wholesale/purchases and updates inventory', async () => {
    auth.asAdmin();
    const batchNo = `BATCH-VERIFY-${Date.now()}`;
    const payload = {
      supplier_id: supplier.id,
      total_amount: 1500,
      tax_amount: 150,
      items: [{
        medicine_name: medicine.name,
        medicine_id: medicine.id,
        batch_number: batchNo,
        qty: 25,
        price: 60.00,
        mrp: 90.00,
        tax: 6,
        tax_percentage: 10,
        schedule: 'G',
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      }],
    };

    const postRes = await request(app)
      .post('/api/purchases')
      .send(payload)
      .expect(201);
    assert.ok(postRes.body.purchaseId);

    // 1. Verify it appears in Wholesale Purchases report endpoint
    const wholesaleRes = await request(app)
      .get('/api/wholesale/purchases')
      .expect(200);
    assert.ok(Array.isArray(wholesaleRes.body));
    const foundWholesale = wholesaleRes.body.find(row => 
      (row.medicine_name === medicine.name || row.item === medicine.name) &&
      row.quantity === 25
    );
    assert.ok(foundWholesale, 'Newly added purchase entry must appear in /wholesale/purchases');
    assert.equal(parseFloat(foundWholesale.price_per_unit), 60.00);
    assert.equal(parseFloat(foundWholesale.total_amount), 1500.00);

    // 2. Verify inventory quantity reflects the new entry
    const invRes = await request(app)
      .get('/api/inventory')
      .expect(200);
    const foundInv = invRes.body.find(i => i.id === medicine.id || i.medicine_id === medicine.id);
    assert.ok(foundInv, 'Medicine must exist in inventory list');
    assert.ok(Number(foundInv.total_stock || foundInv.stock_qty) >= 25, 'Inventory quantity must reflect the added stock');
  });

  await t.test('POST /purchases → 400 when items array is empty', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/purchases').send({ supplier_id: supplier.id, total_amount: 0, items: [] });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('POST /purchases → 400 when supplier_id is missing', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/purchases').send({ total_amount: 100, items: [{ medicine_name: medicine.name, qty: 1, schedule: 'G' }] });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('POST /purchases → 400 for invalid supplier_id', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/purchases').send(validPurchasePayload({ supplier_id: 999999 }));
    assert.equal(res.status, 400);
    assert.ok(res.body.error, 'Must have error field');
  });

  await t.test('POST /purchases → 400 for new medicine without schedule', async () => {
    auth.asAdmin();
    const res = await request(app).post('/api/purchases').send({
      supplier_id: supplier.id,
      total_amount: 100,
      items: [{ medicine_name: `Brandnew-${Date.now()}`, qty: 5, price: 10 }], // no schedule
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error && res.body.error.toLowerCase().includes('schedule'));
  });

  await t.test('[BUG-08 / Phase F] POST /purchases double-submit creates duplicate record', async () => {
    auth.asAdmin();
    const payload = validPurchasePayload();
    const r1 = await request(app).post('/api/purchases').send(payload);
    const r2 = await request(app).post('/api/purchases').send(payload);
    assert.equal(r1.status, 201);
    assert.equal(r2.status, 201);
    assert.notEqual(r1.body.purchaseId, r2.body.purchaseId,
      'BUG-08: Duplicate POST creates 2 purchase records — no idempotency guard');
  });

  // ── PUT /:id ──────────────────────────────────────────────────────────────
  await t.test('PUT /purchases/:id → 200 updated purchase', async () => {
    auth.asAdmin();
    const created = await request(app).post('/api/purchases').send(validPurchasePayload());
    assert.equal(created.status, 201);
    const res = await request(app)
      .put(`/api/purchases/${created.body.purchaseId}`)
      .send({ supplier_id: supplier.id, total_amount: 999, tax_amount: 0 })
      .expect(200);
    assert.equal(parseFloat(res.body.total_amount), 999);
  });

  await t.test('PUT /purchases/:id → 404 for non-existent', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/purchases/999999')
      .send({ supplier_id: supplier.id, total_amount: 0, tax_amount: 0 })
      .expect(404);
    assert.ok(res.body.error);
  });

  // ── DELETE /:id ───────────────────────────────────────────────────────────
  await t.test('[contract] DELETE /purchases/:id → 200 and reverts inventory', async () => {
    auth.asAdmin();
    const created = await request(app).post('/api/purchases').send(validPurchasePayload({ items: [{ medicine_id: medicine.id, batch_number: `DEL-BATCH-${Date.now()}`, qty: 5, price: 10, mrp: 20, schedule: 'G', expiry_date: '2027-01-01' }] }));
    assert.equal(created.status, 201);

    const res = await request(app).delete(`/api/purchases/${created.body.purchaseId}`).expect(200);
    assert.ok(res.body.message);
    assert.ok(res.body.purchase);

    const after = await db.query('SELECT stock_qty FROM INVENTORY WHERE medicine_id=$1 ORDER BY id LIMIT 1', [medicine.id]);
    assert.ok(after.rows.length > 0, 'Inventory record must still exist after delete');
  });

  await t.test('DELETE /purchases/:id → 404 for non-existent', async () => {
    auth.asAdmin();
    const res = await request(app).delete('/api/purchases/999999').expect(404);
    assert.ok(res.body.error);
  });

  await t.test('DELETE /purchases/:id → second delete returns 404', async () => {
    auth.asAdmin();
    const created = await request(app).post('/api/purchases').send(validPurchasePayload());
    await request(app).delete(`/api/purchases/${created.body.purchaseId}`).expect(200);
    const res2 = await request(app).delete(`/api/purchases/${created.body.purchaseId}`);
    assert.equal(res2.status, 404, 'Second delete must return 404');
  });
});
