'use strict';

/**
 * health.api.test.js — Smoke test
 * Verifies the test infrastructure is wired up correctly:
 *   - testApp.js loads .env.test and patches Clerk
 *   - server.js exports app
 *   - The test DB is reachable
 *   - GET /api/health returns { status: 'OK' }
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const db = require('./helpers/dbHelper');

test('Infrastructure smoke test', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
  });

  t.after(async () => {
    await db.teardown();
  });

  await t.test('GET /api/health → 200 with { status: "OK" }', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/);

    assert.equal(res.body.status, 'OK', 'Health check must return status OK');
    assert.ok(res.body.timestamp, 'Health check must include a DB timestamp');
    assert.ok(res.body.message, 'Health check must include a message');
  });
});
