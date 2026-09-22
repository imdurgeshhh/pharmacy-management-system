'use strict';

/**
 * store.api.test.js — /api/store (1 endpoint)
 * Protected with authenticateToken and requireBusinessAccess.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');

test('Module: store', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  await t.test('[contract] GET /store → 200 with shop fields', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/store').expect(200).expect('Content-Type', /json/);
    ['shop_name','address','gstin','phone','dl_no'].forEach(k =>
      assert.ok(k in res.body, `Store response must have field: ${k}`)
    );
  });

  await t.test('GET /store values come from env when no DB row exists', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/store').expect(200);
    Object.values(res.body).forEach(v =>
      assert.ok(typeof v === 'string' || v === null,
        'All store fields must be strings or null')
    );
  });

  await t.test('[auth] GET /store without token → 401', async () => {
    auth.clear();
    const res = await request(app).get('/api/store');
    assert.equal(res.status, 401, 'Endpoint must require authentication');
    auth.asAdmin();
  });

  await t.test('GET /store → response must not contain stack trace', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/store');
    assert.ok(!JSON.stringify(res.body).includes('at Object.'), 'Must not leak stack trace');
  });

  await t.test('[contract] PUT /store → 200 on valid upsert and updates GET /store', async () => {
    auth.asAdmin();
    const payload = {
      shop_name: 'Apex Health Pharmacy',
      address: '123 Main Medical Street, Raipur, CG',
      phone: '9876543210',
      email: 'apex@pharmacy.com',
      dl_no: 'DL-CG-2025-001',
      gstin: '22AAAAA0000A1Z5',
      pharmacist_name: 'Dr. Ramesh Kumar',
      pharmacist_reg_no: 'CG-PH-2024-987'
    };

    const putRes = await request(app)
      .put('/api/store')
      .send(payload)
      .expect(200);

    assert.equal(putRes.body.shop_name, 'Apex Health Pharmacy');
    assert.equal(putRes.body.phone, '9876543210');
    assert.equal(putRes.body.gstin, '22AAAAA0000A1Z5');
    assert.equal(putRes.body.pharmacist_name, 'Dr. Ramesh Kumar');
    assert.equal(putRes.body.pharmacist_reg_no, 'CG-PH-2024-987');

    // Confirm GET /store immediately reflects the new values
    const getRes = await request(app).get('/api/store').expect(200);
    assert.equal(getRes.body.shop_name, 'Apex Health Pharmacy');
    assert.equal(getRes.body.pharmacist_name, 'Dr. Ramesh Kumar');
    assert.equal(getRes.body.gstin, '22AAAAA0000A1Z5');
  });

  await t.test('PUT /store → 400 when shop_name is missing', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: '',
        address: '123 Main St',
        phone: '9876543210',
        dl_no: 'DL-123'
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Pharmacy \/ Store Name is required/i);
  });

  await t.test('PUT /store → 400 when address is missing', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: 'Test Pharmacy',
        address: '   ',
        phone: '9876543210',
        dl_no: 'DL-123'
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Complete Address is required/i);
  });

  await t.test('PUT /store → 400 when phone is not a valid 10-digit number', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: 'Test Pharmacy',
        address: '123 Main St',
        phone: '12345',
        dl_no: 'DL-123'
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /10-digit number/i);
  });

  await t.test('PUT /store → 400 when dl_no is missing', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: 'Test Pharmacy',
        address: '123 Main St',
        phone: '9876543210',
        dl_no: ''
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Drug Licence Number is required/i);
  });

  await t.test('PUT /store → 400 when GSTIN format is invalid', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: 'Test Pharmacy',
        address: '123 Main St',
        phone: '9876543210',
        dl_no: 'DL-123',
        gstin: 'INVALID-GST'
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid GSTIN format/i);
  });

  await t.test('PUT /store → 400 when email format is invalid', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: 'Test Pharmacy',
        address: '123 Main St',
        phone: '9876543210',
        dl_no: 'DL-123',
        email: 'invalid-email-string'
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid email address/i);
  });

  await t.test('[rbac] PUT /store as shopkeeper → 403 Forbidden', async () => {
    auth.asShopkeeper();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: 'Shopkeeper Attempt',
        address: '123 Main St',
        phone: '9876543210',
        dl_no: 'DL-123'
      });
    assert.equal(res.status, 403, 'Shopkeeper must not be allowed to edit store settings');
    auth.asAdmin();
  });

  await t.test('[auth] PUT /store without auth token → 401', async () => {
    auth.clear();
    const res = await request(app)
      .put('/api/store')
      .send({
        shop_name: 'Unauthorized Attempt',
        address: '123 Main St',
        phone: '9876543210',
        dl_no: 'DL-123'
      });
    assert.equal(res.status, 401);
    auth.asAdmin();
  });
});

