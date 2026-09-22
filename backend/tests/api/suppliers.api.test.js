'use strict';

/**
 * suppliers.api.test.js — /api/suppliers (5 endpoints)
 * Protected with authenticateToken, requireBusinessAccess (and adminOnly on DELETE).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createSupplier } = require('./helpers/factories');

test('Module: suppliers', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  // ── GET / ─────────────────────────────────────────────────────────────────
  await t.test('[contract] GET /suppliers → 200 array', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/suppliers').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const s = res.body[0];
      ['id','name','contact_person','phone','email','address'].forEach(k =>
        assert.ok(k in s, `Supplier must have field: ${k}`)
      );
    }
  });

  // ── GET /:id ──────────────────────────────────────────────────────────────
  await t.test('GET /suppliers/:id → 200 for existing supplier', async () => {
    auth.asAdmin();
    const s = await createSupplier();
    const res = await request(app).get(`/api/suppliers/${s.id}`).expect(200);
    assert.equal(res.body.id, s.id);
    assert.ok(res.body.name);
  });

  await t.test('GET /suppliers/:id → 404 for unknown ID', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/suppliers/999999').expect(404);
    assert.ok(res.body.error);
  });

  await t.test('GET /suppliers/abc → graceful error (no SQL in response)', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/suppliers/abc');
    assert.ok(!JSON.stringify(res.body).includes('syntax error'),
      'Response must not expose SQL syntax errors');
  });

  // ── POST / ────────────────────────────────────────────────────────────────
  await t.test('[contract] POST /suppliers → 201 with created supplier', async () => {
    auth.asAdmin();
    const payload = { name: 'New Pharma Co', contact_person: 'Mr X', phone: '7700000001', email: 'x@pharma.com', address: '1 Pharma Lane' };
    const res = await request(app)
      .post('/api/suppliers').send(payload).expect(201).expect('Content-Type', /json/);
    assert.ok(res.body.id);
    assert.equal(res.body.name, 'New Pharma Co');
    assert.equal(res.body.phone, '7700000001');
  });

  await t.test('[auth] POST /suppliers without token → 401', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/suppliers')
      .send({ name: 'NoAuthTest', phone: '7700000099', contact_person: 'T', email: 't@t.com', address: 'A' });
    assert.equal(res.status, 401, 'Endpoint must require authentication');
    auth.asAdmin();
  });

  // ── PUT /:id ──────────────────────────────────────────────────────────────
  await t.test('PUT /suppliers/:id → 200 updated supplier', async () => {
    auth.asAdmin();
    const s = await createSupplier();
    const res = await request(app)
      .put(`/api/suppliers/${s.id}`)
      .send({ name: 'Updated Name', contact_person: s.contact_person, phone: s.phone, email: s.email, address: s.address })
      .expect(200);
    assert.equal(res.body.name, 'Updated Name');
  });

  await t.test('PUT /suppliers/:id → 404 for unknown ID', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/suppliers/999999')
      .send({ name: 'Ghost', contact_person: 'G', phone: '0000000002', email: 'g@g.com', address: 'A' })
      .expect(404);
    assert.ok(res.body.error);
  });

  await t.test('PUT /suppliers/:id idempotency — same update twice', async () => {
    auth.asAdmin();
    const s = await createSupplier();
    const payload = { name: 'Idem Supplier', contact_person: s.contact_person, phone: s.phone, email: s.email, address: s.address };
    await request(app).put(`/api/suppliers/${s.id}`).send(payload).expect(200);
    const res2 = await request(app).put(`/api/suppliers/${s.id}`).send(payload).expect(200);
    assert.equal(res2.body.name, 'Idem Supplier');
  });

  // ── DELETE /:id — admin only ───────────────────────────────────────────────
  await t.test('[contract] DELETE /suppliers/:id — admin → 200', async () => {
    const s = await createSupplier();
    const res = await auth.withRole('admin',
      () => request(app).delete(`/api/suppliers/${s.id}`));
    assert.equal(res.status, 200);
    assert.ok(res.body.message);
    assert.ok(res.body.supplier, 'Must return deleted supplier object');
  });

  await t.test('DELETE /suppliers/:id — shopkeeper → 403', async () => {
    const s = await createSupplier();
    const res = await auth.withRole('shopkeeper',
      () => request(app).delete(`/api/suppliers/${s.id}`));
    assert.equal(res.status, 403);
    assert.ok(res.body.error);
  });

  await t.test('DELETE /suppliers/:id — employee → 403', async () => {
    const s = await createSupplier();
    const res = await auth.withRole('employee',
      () => request(app).delete(`/api/suppliers/${s.id}`));
    assert.equal(res.status, 403);
  });

  await t.test('DELETE /suppliers/:id — anonymous → 401', async () => {
    auth.clear();
    const s = await createSupplier();
    const res = await request(app).delete(`/api/suppliers/${s.id}`).expect(401);
    assert.ok(res.body.error);
    auth.asAdmin();
  });

  await t.test('DELETE /suppliers/:id — second delete → 404', async () => {
    const s = await createSupplier();
    await auth.withRole('admin', () => request(app).delete(`/api/suppliers/${s.id}`));
    const res = await auth.withRole('admin',
      () => request(app).delete(`/api/suppliers/${s.id}`));
    assert.equal(res.status, 404, 'Second delete must return 404');
  });

  await t.test('DELETE /suppliers/999999 — admin, non-existent → 404', async () => {
    const res = await auth.withRole('admin',
      () => request(app).delete('/api/suppliers/999999'));
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});
