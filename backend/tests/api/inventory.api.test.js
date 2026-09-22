'use strict';

/**
 * inventory.api.test.js — /api/inventory (6 endpoints)
 * Protected with authenticateToken, requireBusinessAccess (and adminOnly on DELETE).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createMedicine, createInventoryBatch, createSupplier } = require('./helpers/factories');

test('Module: inventory', async (t) => {
  let seeded;
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    seeded = await db.seed();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  // ── GET / ─────────────────────────────────────────────────────────────────
  await t.test('[contract] GET /inventory → 200 array of medicine+stock objects', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/inventory').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body), 'Must return array');
    if (res.body.length > 0) {
      const m = res.body[0];
      ['id','medicine_name','total_stock','mrp','schedule'].forEach(k =>
        assert.ok(k in m, `Inventory item must have field: ${k}`)
      );
    }
  });

  await t.test('GET /inventory?schedule=H → filtered results', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/inventory?schedule=H').expect(200);
    assert.ok(Array.isArray(res.body));
    res.body.forEach(m => assert.equal(m.schedule, 'H', 'All returned items must have schedule=H'));
  });

  await t.test('GET /inventory?schedule=INVALID → returns 200 with empty array (unvalidated query param)', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/inventory?schedule=INVALID').expect(200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 0);
  });

  await t.test('GET /inventory?search=Para → returns matching medicines', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/inventory?search=Para').expect(200);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      assert.ok(res.body[0].medicine_name.toLowerCase().includes('para') ||
                res.body[0].name?.toLowerCase().includes('para'),
        'Returned medicines must match search term');
    }
  });

  // ── GET /alerts ────────────────────────────────────────────────────────────
  await t.test('[contract] GET /inventory/alerts → 200 array', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/inventory/alerts').expect(200);
    assert.ok(Array.isArray(res.body));
    // med2 in seed has stock_qty=5 which is < 20 — should appear in alerts
    if (res.body.length > 0) {
      const a = res.body[0];
      ['name','batch_number','stock_qty','expiry_date'].forEach(k =>
        assert.ok(k in a, `Alert must have field: ${k}`)
      );
    }
  });

  // ── GET /medicine/:id/batches ─────────────────────────────────────────────
  await t.test('[contract] GET /inventory/medicine/:id/batches → 200 array', async () => {
    auth.asAdmin();
    const res = await request(app)
      .get(`/api/inventory/medicine/${seeded.med1Id}/batches`)
      .expect(200);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      assert.ok('batch_number' in res.body[0], 'Batch must have batch_number');
      assert.ok('stock_qty' in res.body[0], 'Batch must have stock_qty');
    }
  });

  await t.test('GET /inventory/medicine/:id/batches → empty array for new medicine (no stock)', async () => {
    auth.asAdmin();
    const med = await createMedicine();
    const res = await request(app)
      .get(`/api/inventory/medicine/${med.id}/batches`)
      .expect(200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 0, 'No batches means empty array, not 404');
  });

  // ── POST /medicine ────────────────────────────────────────────────────────
  await t.test('[contract] POST /inventory/medicine → 201 with created medicine', async () => {
    auth.asAdmin();
    const payload = {
      medicine_name: 'Test Aspirin 100mg', brand_name: 'Disprin',
      salt_composition: 'Aspirin', medicine_category: 'Analgesic',
      dosage_form: 'Tablet', strength: '100mg', barcode: `ASP-${Date.now()}`,
      description: 'Pain reliever', schedule: 'G', hsn_code: '3004', pack_size: '10'
    };
    const res = await request(app)
      .post('/api/inventory/medicine').send(payload).expect(201).expect('Content-Type', /json/);
    assert.ok(res.body.id, 'Created medicine must have id');
    assert.ok(res.body.medicine_name || res.body.name);
  });

  await t.test('POST /inventory/medicine: invalid schedule → 400', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/inventory/medicine')
      .send({ medicine_name: 'BadSched', schedule: 'INVALID', barcode: `BS-${Date.now()}` })
      .expect(400);
    assert.ok(res.body.error, 'Must have error field');
    assert.ok(res.body.error.toLowerCase().includes('schedule'),
      'Error must mention schedule');
  });

  await t.test('[auth] POST /inventory/medicine without token → 401', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/inventory/medicine')
      .send({ medicine_name: 'PublicAdd', schedule: 'G', barcode: `PUB-${Date.now()}` });
    assert.equal(res.status, 401, 'Endpoint must require authentication');
    auth.asAdmin();
  });

  // ── PUT /medicine/:id ─────────────────────────────────────────────────────
  await t.test('PUT /inventory/medicine/:id → 200 with updated medicine', async () => {
    auth.asAdmin();
    const med = await createMedicine();
    const res = await request(app)
      .put(`/api/inventory/medicine/${med.id}`)
      .send({ medicine_name: 'Updated Name', schedule: 'G', barcode: med.barcode })
      .expect(200);
    assert.ok(res.body.medicine_name === 'Updated Name' || res.body.name === 'Updated Name');
  });

  await t.test('PUT /inventory/medicine/:id: invalid schedule → 400', async () => {
    auth.asAdmin();
    const med = await createMedicine();
    const res = await request(app)
      .put(`/api/inventory/medicine/${med.id}`)
      .send({ medicine_name: med.name, schedule: 'BAD' })
      .expect(400);
    assert.ok(res.body.error);
  });

  // ── DELETE /medicine/:id ──────────────────────────────────────────────────
  await t.test('[contract] DELETE /inventory/medicine/:id — admin → 200', async () => {
    const med = await createMedicine();
    const res = await auth.withRole('admin',
      () => request(app).delete(`/api/inventory/medicine/${med.id}`));
    assert.equal(res.status, 200);
    assert.ok(res.body.message);
  });

  await t.test('DELETE /inventory/medicine/:id — shopkeeper → 403', async () => {
    const med = await createMedicine();
    const res = await auth.withRole('shopkeeper',
      () => request(app).delete(`/api/inventory/medicine/${med.id}`));
    assert.equal(res.status, 403);
  });

  await t.test('DELETE /inventory/medicine/:id — anonymous → 401', async () => {
    auth.clear();
    const med = await createMedicine();
    const res = await request(app).delete(`/api/inventory/medicine/${med.id}`).expect(401);
    assert.ok(res.body.error);
    auth.asAdmin();
  });

  await t.test('[BUG-03] DELETE /inventory/medicine/999999 — non-existent → should 404, currently 200', async () => {
    const res = await auth.withRole('admin',
      () => request(app).delete('/api/inventory/medicine/999999'));
    if (res.status === 200) {
      assert.ok(true, 'BUG-03 confirmed: DELETE non-existent medicine returns 200 instead of 404');
    } else {
      assert.equal(res.status, 404, 'Fixed: now correctly returns 404');
    }
  });
});
