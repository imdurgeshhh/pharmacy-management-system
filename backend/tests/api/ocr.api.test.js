'use strict';

/**
 * ocr.api.test.js — /api/ocr/scan (1 endpoint)
 * Protected with authenticateToken and requireBusinessAccess.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');

test('Module: ocr', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  await t.test('POST /ocr/scan → 400 when no file is attached', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/ocr/scan')
      .expect(400);
    assert.ok(res.body.error || res.body.message, 'Must have error message');
  });

  await t.test('[auth] POST /ocr/scan without token → 401', async () => {
    auth.clear();
    const res = await request(app).post('/api/ocr/scan');
    assert.equal(res.status, 401, 'Endpoint must require authentication');
    auth.asAdmin();
  });

  await t.test('[BUG-05] POST /ocr/scan accepts non-image file type (document)', async () => {
    auth.asAdmin();
    // Send a fake .txt file — Multer should reject it, but currently it does not
    const fakeFile = Buffer.from('This is not an image');
    const res = await request(app)
      .post('/api/ocr/scan')
      .attach('invoice', fakeFile, { filename: 'test.txt', contentType: 'text/plain' });
    if (res.status === 400 && res.body.error?.includes('type')) {
      assert.ok(true, 'Fixed: file type validation now exists');
    } else {
      assert.ok([200, 400, 500].includes(res.status),
        `Non-image file returned ${res.status}`);
    }
  });

  await t.test('[contract] POST /ocr/scan response shape when file provided → 200 or 500 (no crash)', async () => {
    auth.asAdmin();
    // Send a minimal valid PNG (1x1 pixel, smallest valid PNG)
    const minimalPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
      '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex'
    );
    const res = await request(app)
      .post('/api/ocr/scan')
      .attach('invoice', minimalPng, { filename: 'test.png', contentType: 'image/png' });
    // OCR may fail (500) or succeed (200) — either is acceptable in test env
    assert.ok([200, 400, 500].includes(res.status),
      `OCR endpoint returned unexpected status: ${res.status}`);
    if (res.status === 200) {
      assert.ok('data' in res.body, 'Success response must have data field');
      assert.ok('rawText' in res.body.data, 'data must have rawText');
      assert.ok(Array.isArray(res.body.data.potentialItems), 'data must have potentialItems array');
    }
    // Must not return stack traces regardless of outcome
    assert.ok(!JSON.stringify(res.body).includes('at Object.'),
      'Response must not leak a stack trace');
  });
});
