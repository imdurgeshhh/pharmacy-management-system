'use strict';

/**
 * reports.api.test.js — /api/reports (2 endpoints)
 * Protected with authenticateToken, adminOnly, requireBusinessAccess.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');

test('Module: reports', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  // ── GET /dashboard ────────────────────────────────────────────────────────
  await t.test('[contract] GET /reports/dashboard → 200 with numeric stats', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/reports/dashboard').expect(200).expect('Content-Type', /json/);
    const { todaySales, monthSales, inventoryValue, lowStockItems } = res.body;
    assert.ok(typeof todaySales === 'number', 'todaySales must be a number');
    assert.ok(typeof monthSales === 'number', 'monthSales must be a number');
    assert.ok(typeof inventoryValue === 'number', 'inventoryValue must be a number');
    assert.ok(typeof lowStockItems === 'number', 'lowStockItems must be a number');
  });

  await t.test('GET /reports/dashboard values are non-negative', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/reports/dashboard').expect(200);
    assert.ok(res.body.todaySales >= 0, 'todaySales must be >= 0');
    assert.ok(res.body.inventoryValue >= 0, 'inventoryValue must be >= 0');
    assert.ok(res.body.lowStockItems >= 0, 'lowStockItems must be >= 0');
    assert.ok(res.body.lowStockItems >= 1, 'Seeded low-stock medicine must be counted');
  });

  await t.test('[auth] GET /reports/dashboard requires admin role', async () => {
    auth.clear();
    const anonRes = await request(app).get('/api/reports/dashboard');
    assert.equal(anonRes.status, 401);

    const shopRes = await auth.withRole('shopkeeper',
      () => request(app).get('/api/reports/dashboard'));
    assert.equal(shopRes.status, 403);
    auth.asAdmin();
  });

  await t.test('GET /reports/dashboard error response must not leak DB details', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/reports/dashboard');
    if (res.status !== 200) {
      assert.ok(!JSON.stringify(res.body).includes('pg_'), 'Must not leak Postgres internals');
      assert.ok(!JSON.stringify(res.body).includes('at '), 'Must not leak stack trace');
    }
  });

  // ── GET /sales ────────────────────────────────────────────────────
  await t.test('[contract] GET /reports/sales → 200 array with date, sales, tax', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/reports/sales').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body), 'Sales report must be an array');
    if (res.body.length > 0) {
      const row = res.body[0];
      assert.ok('date' in row, 'Row must have date');
      assert.ok('sales' in row, 'Row must have sales');
      assert.ok('tax' in row, 'Row must have tax');
    }
  });

  await t.test('GET /reports/sales covers only last 7 days', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/reports/sales').expect(200);
    const today = new Date();
    const sevenDaysAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    res.body.forEach(row => {
      const rowDate = new Date(row.date);
      assert.ok(rowDate >= sevenDaysAgo, `Row date ${row.date} must be within last 7 days`);
    });
  });

  await t.test('[auth] GET /reports/sales requires admin role', async () => {
    auth.clear();
    const anonRes = await request(app).get('/api/reports/sales');
    assert.equal(anonRes.status, 401);

    const shopRes = await auth.withRole('shopkeeper',
      () => request(app).get('/api/reports/sales'));
    assert.equal(shopRes.status, 403);
    auth.asAdmin();
  });
});
