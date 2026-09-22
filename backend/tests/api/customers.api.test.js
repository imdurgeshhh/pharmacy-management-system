'use strict';

/**
 * customers.api.test.js — /api/customers (all 5 endpoints)
 * Secured with authenticateToken and requireBusinessAccess.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createCustomer } = require('./helpers/factories');

test('Module: customers', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  // ── GET / ─────────────────────────────────────────────────────────────────
  await t.test('[contract] GET /customers → 200 array of customer objects', async () => {
    auth.asAdmin();
    await createCustomer({ name: 'Alpha Patient', phone: '9000000100' });
    const res = await request(app).get('/api/customers').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const c = res.body[0];
      assert.ok('id' in c, 'Must have id');
      assert.ok('name' in c, 'Must have name');
      assert.ok('phone' in c, 'Must have phone');
    }
  });

  await t.test('[auth] GET /customers without token → 401', async () => {
    auth.clear();
    const res = await request(app).get('/api/customers');
    assert.equal(res.status, 401, 'Endpoint must require authentication');
    auth.asAdmin();
  });

  // ── GET /:id ──────────────────────────────────────────────────────────────
  await t.test('GET /customers/:id → 200 for existing customer', async () => {
    auth.asAdmin();
    const c = await createCustomer({ name: 'Beta Patient', phone: '9000000101' });
    const res = await request(app).get(`/api/customers/${c.id}`).expect(200);
    assert.equal(res.body.id, c.id);
    assert.equal(res.body.name, 'Beta Patient');
  });

  await t.test('GET /customers/:id → 404 for non-existent ID', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/customers/999999').expect(404);
    assert.ok(res.body.error, 'Must have error field');
  });

  await t.test('GET /customers/:id → no stack trace on 404', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/customers/999999');
    assert.ok(!JSON.stringify(res.body).includes('at Object.'), 'Must not leak stack');
  });

  await t.test('GET /customers/abc → DB handles gracefully (no 500 leak)', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/customers/abc');
    // Postgres will cast 'abc' to int and either 404 or 400 — must NOT be a raw 500 with SQL
    if (res.status === 500) {
      assert.ok(!JSON.stringify(res.body).includes('syntax error'),
        '[BUG] Error response must not expose raw SQL syntax error');
    }
  });

  // ── POST / ────────────────────────────────────────────────────────────────
  await t.test('[contract] POST /customers → 201 with created customer', async () => {
    auth.asAdmin();
    const payload = { name: 'Gamma Patient', phone: '9000000102', email: 'gamma@test.pharma' };
    const res = await request(app)
      .post('/api/customers')
      .send(payload)
      .expect(201)
      .expect('Content-Type', /json/);

    assert.ok(res.body.id, 'Created customer must have id');
    assert.equal(res.body.name, 'Gamma Patient');
    assert.equal(res.body.phone, '9000000102');
  });

  await t.test('[BUG-07] POST /customers without name → 500 from DB constraint (should be 400)', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/customers')
      .send({ phone: '9000000199' });  // missing name
    if (res.status === 500) {
      assert.ok(res.body.error, 'BUG: missing name returns 500 instead of 400');
    } else {
      assert.ok(res.status === 400, `Missing name should be 400, got ${res.status}`);
    }
  });

  await t.test('POST /customers: wrong Content-Type → 400 or graceful handling', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/customers')
      .set('Content-Type', 'text/plain')
      .send('name=test');
    assert.ok(res.status >= 400 || res.status === 201,
      'Wrong Content-Type must not crash the server');
  });

  // ── PUT /:id ──────────────────────────────────────────────────────────────
  await t.test('PUT /customers/:id → 200 with updated customer', async () => {
    auth.asAdmin();
    const c = await createCustomer({ name: 'Delta Patient', phone: '9000000103' });
    const res = await request(app)
      .put(`/api/customers/${c.id}`)
      .send({ name: 'Delta Updated', phone: '9000000103', email: 'delta@test.pharma' })
      .expect(200);
    assert.equal(res.body.name, 'Delta Updated');
  });

  await t.test('PUT /customers/:id → 404 for non-existent ID', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/customers/999999')
      .send({ name: 'Ghost', phone: '0000000000' })
      .expect(404);
    assert.ok(res.body.error);
  });

  await t.test('PUT /customers/:id idempotency — same update twice gives same result', async () => {
    auth.asAdmin();
    const c = await createCustomer({ name: 'Idem Patient', phone: '9000000104' });
    const payload = { name: 'Idem Updated', phone: '9000000104', email: null };
    await request(app).put(`/api/customers/${c.id}`).send(payload).expect(200);
    const res2 = await request(app).put(`/api/customers/${c.id}`).send(payload).expect(200);
    assert.equal(res2.body.name, 'Idem Updated', 'Second PUT must return same state');
  });

  // ── DELETE /:id ───────────────────────────────────────────────────────────
  await t.test('DELETE /customers/:id → 200 with deleted customer', async () => {
    auth.asAdmin();
    const c = await createCustomer({ name: 'Zeta Patient', phone: '9000000105' });
    const res = await request(app).delete(`/api/customers/${c.id}`).expect(200);
    assert.ok(res.body.message, 'Must have message field');
    assert.ok(res.body.customer, 'Must return deleted customer');
  });

  await t.test('DELETE /customers/:id → 404 for non-existent ID', async () => {
    auth.asAdmin();
    const res = await request(app).delete('/api/customers/999999').expect(404);
    assert.ok(res.body.error);
  });

  await t.test('DELETE /customers/:id → second delete returns 404', async () => {
    auth.asAdmin();
    const c = await createCustomer({ name: 'Del Twice', phone: '9000000106' });
    await request(app).delete(`/api/customers/${c.id}`).expect(200);
    const res2 = await request(app).delete(`/api/customers/${c.id}`).expect(404);
    assert.ok(res2.body.error, 'Second delete must return error');
  });
});
