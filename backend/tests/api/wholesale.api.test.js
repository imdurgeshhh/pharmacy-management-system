'use strict';

/**
 * wholesale.api.test.js — /api/wholesale (6 endpoints)
 * Protected with authenticateToken, requireBusinessAccess (and adminOnly on DELETE).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createWholesaleSale, createWholesalePurchase } = require('./helpers/factories');

test('Module: wholesale', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  // ── SALES ─────────────────────────────────────────────────────────────────
  await t.test('[contract] GET /wholesale/sales → 200 array', async () => {
    auth.asAdmin();
    await createWholesaleSale();
    const res = await request(app).get('/api/wholesale/sales').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const s = res.body[0];
      ['id','medicine_name','quantity','price_per_unit','total_amount','shopkeeper_name','sale_date'].forEach(k =>
        assert.ok(k in s, `Wholesale sale must have field: ${k}`)
      );
    }
  });

  await t.test('[contract] POST /wholesale/sales → 201 with full record', async () => {
    auth.asAdmin();
    const payload = {
      medicine_name: 'Test Paracetamol 500mg',
      quantity: 100,
      price_per_unit: 15.00,
      shopkeeper_name: 'City Chemist',
      gst_number: '29AAAAA0000A1Z5',
      sale_date: new Date().toISOString().slice(0, 10),
    };
    const res = await request(app)
      .post('/api/wholesale/sales').send(payload).expect(201).expect('Content-Type', /json/);
    assert.ok(res.body.id, 'Must return id');
    assert.equal(res.body.medicine_name, 'Test Paracetamol 500mg');
    assert.equal(parseInt(res.body.quantity), 100);
    assert.equal(parseFloat(res.body.price_per_unit), 15.00);
    assert.ok(res.body.total_amount, 'Must have total_amount (generated column)');
    assert.equal(parseFloat(res.body.total_amount), 1500.00, 'total_amount must be qty * price_per_unit');
  });

  await t.test('POST /wholesale/sales → 400 when required fields missing', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/wholesale/sales')
      .send({ medicine_name: 'Incomplete' })  // missing quantity, price_per_unit, shopkeeper_name
      .expect(400);
    assert.ok(res.body.error);
    assert.ok(res.body.error.toLowerCase().includes('required') ||
              res.body.error.toLowerCase().includes('medicine_name'),
      'Error must mention missing required fields');
  });

  await t.test('[auth] POST /wholesale/sales without token → 401', async () => {
    auth.clear();
    const res = await request(app).post('/api/wholesale/sales').send({
      medicine_name: 'PubTest', quantity: 10, price_per_unit: 5, shopkeeper_name: 'S1'
    });
    assert.equal(res.status, 401, 'Endpoint must require authentication');
    auth.asAdmin();
  });

  await t.test('[BUG-08 / Phase F] POST /wholesale/sales double-submit creates duplicates', async () => {
    auth.asAdmin();
    const payload = { medicine_name: 'Idem Med', quantity: 50, price_per_unit: 20, shopkeeper_name: `Idem Shop` };
    const r1 = await request(app).post('/api/wholesale/sales').send(payload);
    const r2 = await request(app).post('/api/wholesale/sales').send(payload);
    assert.equal(r1.status, 201);
    assert.equal(r2.status, 201);
    assert.notEqual(r1.body.id, r2.body.id, 'BUG-08: Two records created from identical payload');
  });

  await t.test('DELETE /wholesale/sales/:id — admin → 200', async () => {
    const s = await createWholesaleSale();
    const res = await auth.withRole('admin',
      () => request(app).delete(`/api/wholesale/sales/${s.id}`));
    assert.equal(res.status, 200);
    assert.ok(res.body.message);
  });

  await t.test('DELETE /wholesale/sales/:id — shopkeeper → 403', async () => {
    const s = await createWholesaleSale();
    const res = await auth.withRole('shopkeeper',
      () => request(app).delete(`/api/wholesale/sales/${s.id}`));
    assert.equal(res.status, 403);
    assert.ok(res.body.error);
  });

  await t.test('DELETE /wholesale/sales/:id — anonymous → 401', async () => {
    auth.clear();
    const s = await createWholesaleSale();
    const res = await request(app).delete(`/api/wholesale/sales/${s.id}`).expect(401);
    assert.ok(res.body.error);
    auth.asAdmin();
  });

  await t.test('DELETE /wholesale/sales/:id → second delete returns 404', async () => {
    const s = await createWholesaleSale();
    await auth.withRole('admin', () => request(app).delete(`/api/wholesale/sales/${s.id}`));
    const res2 = await auth.withRole('admin',
      () => request(app).delete(`/api/wholesale/sales/${s.id}`));
    assert.equal(res2.status, 404, 'Second delete must return 404');
  });

  await t.test('DELETE /wholesale/sales/999999 → admin, non-existent → 404', async () => {
    const res = await auth.withRole('admin',
      () => request(app).delete('/api/wholesale/sales/999999'));
    assert.equal(res.status, 404);
  });

  // ── PURCHASES ─────────────────────────────────────────────────────────────
  await t.test('[contract] GET /wholesale/purchases → 200 array', async () => {
    auth.asAdmin();
    await createWholesalePurchase();
    const res = await request(app).get('/api/wholesale/purchases').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const p = res.body[0];
      ['id','medicine_name','quantity','price_per_unit','total_amount','supplier_name','purchase_date'].forEach(k =>
        assert.ok(k in p, `Wholesale purchase must have field: ${k}`)
      );
    }
  });

  await t.test('[contract] POST /wholesale/purchases → 201 with full record', async () => {
    auth.asAdmin();
    const payload = {
      medicine_name: 'Wholesale Amoxicillin',
      quantity: 200,
      price_per_unit: 12.00,
      supplier_name: 'Pharma Distributor',
      purchase_date: new Date().toISOString().slice(0, 10),
    };
    const res = await request(app)
      .post('/api/wholesale/purchases').send(payload).expect(201);
    assert.ok(res.body.id);
    assert.equal(parseFloat(res.body.total_amount), 2400.00);
  });

  await t.test('POST /wholesale/purchases → 400 when required fields missing', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/wholesale/purchases')
      .send({ medicine_name: 'Incomplete' })
      .expect(400);
    assert.ok(res.body.error);
  });

  await t.test('DELETE /wholesale/purchases/:id — admin → 200', async () => {
    const p = await createWholesalePurchase();
    const res = await auth.withRole('admin',
      () => request(app).delete(`/api/wholesale/purchases/${p.id}`));
    assert.equal(res.status, 200);
    assert.ok(res.body.message);
  });

  await t.test('DELETE /wholesale/purchases/:id — shopkeeper → 403', async () => {
    const p = await createWholesalePurchase();
    const res = await auth.withRole('shopkeeper',
      () => request(app).delete(`/api/wholesale/purchases/${p.id}`));
    assert.equal(res.status, 403);
  });

  await t.test('DELETE /wholesale/purchases/:id — anonymous → 401', async () => {
    auth.clear();
    const p = await createWholesalePurchase();
    const res = await request(app).delete(`/api/wholesale/purchases/${p.id}`).expect(401);
    assert.ok(res.body.error);
    auth.asAdmin();
  });

  await t.test('DELETE /wholesale/purchases/:id → second delete returns 404', async () => {
    const p = await createWholesalePurchase();
    await auth.withRole('admin', () => request(app).delete(`/api/wholesale/purchases/${p.id}`));
    const res2 = await auth.withRole('admin',
      () => request(app).delete(`/api/wholesale/purchases/${p.id}`));
    assert.equal(res2.status, 404);
  });
});
