'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');

test('Module: Security Hardening (Input Validation & Error Leakage)', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
  });
  t.after(async () => {
    auth.clear();
    await db.teardown();
  });

  // ── 1. Input Validation: Strict Schema Enforcement ─────────────────────────

  await t.test('POST /api/customers rejects phone number with non-digits or wrong length', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/customers')
      .send({
        name: 'John Doe',
        phone: '12345abcde' // Invalid phone
      });
    assert.equal(res.status, 400);
    assert.ok(res.body.error, 'Should have error message');
    assert.match(res.body.error, /10-digit/i);
  });

  await t.test('POST /api/customers rejects invalid GSTIN format', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/customers')
      .send({
        name: 'Acme Health',
        phone: '9876543210',
        gstin: 'INVALID-GST-FORMAT'
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /GSTIN/i);
  });

  await t.test('POST /api/inventory rejects invalid medicine schedule', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/inventory')
      .send({
        name: 'Crocin Pain Relief',
        schedule: 'INVALID_SCHEDULE'
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid schedule/i);
  });

  await t.test('POST /api/suppliers rejects missing contact number', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/suppliers')
      .send({
        name: 'MediSupply Corp'
        // phone missing
      });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('GET /api/customers/:id rejects non-integer id', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/customers/notanid');
    assert.equal(res.status, 400);
    assert.match(res.body.error, /positive integer/i);
  });

  await t.test('POST /api/sales rejects empty items array', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/sales')
      .send({
        items: []
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /at least one item/i);
  });

  // ── 2. Error Handling & Information Leakage ────────────────────────────────

  await t.test('Unhandled 404 does not leak internal details', async () => {
    const res = await request(app).get('/api/non-existent-route-xyz');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Endpoint not found' });
  });

  await t.test('Responses never contain stack traces or server file paths', async () => {
    auth.asAdmin();
    // Intentionally send bad JSON or cause error
    const res = await request(app)
      .post('/api/customers')
      .set('Content-Type', 'application/json')
      .send('{ bad json');

    assert.equal(res.status, 400);
    const bodyStr = JSON.stringify(res.body);
    assert.ok(!bodyStr.includes('node_modules'), 'Must not contain internal file paths');
    assert.ok(!bodyStr.includes('    at '), 'Must not contain stack traces');
  });

  // ── 3. File Upload Safety (Magic Bytes) ────────────────────────────────────

  await t.test('POST /api/ocr/scan rejects spoofed executable named invoice.png', async () => {
    auth.asAdmin();
    // MZ header is executable (Windows PE executable / DLL)
    const fakeExecutable = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
    const res = await request(app)
      .post('/api/ocr/scan')
      .attach('invoice', fakeExecutable, { filename: 'malware.png', contentType: 'image/png' });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /genuine image/i);
  });
});
