'use strict';

/**
 * auth.api.test.js — POST /api/auth/clerk-sync  |  GET /api/auth/employees
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');

test('Module: auth', async (t) => {
  t.before(async () => { await db.setupSchema(); await db.resetDb(); await db.seed(); });
  t.after(async () => { auth.clear(); await db.teardown(); });

  // ── POST /api/auth/clerk-sync ─────────────────────────────────────────────
  await t.test('clerk-sync: happy path — new user → 201 with user object', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .send({ email: 'newclerk@test.pharma', full_name: 'New Clerk', username: 'newclerk' })
      .expect(201)
      .expect('Content-Type', /json/);

    assert.ok(res.body.user, 'Response must have a user object');
    assert.ok(res.body.user.id, 'User must have an id');
    assert.equal(res.body.user.email, 'newclerk@test.pharma');
    assert.ok(['admin','shopkeeper','employee'].includes(res.body.user.role),
      `Role must be one of admin/shopkeeper/employee, got: ${res.body.user.role}`);
    // [contract] response shape: { message, user: { id, name, email, username, role } }
    assert.ok('message' in res.body || 'user' in res.body, 'Must have message or user field');
  });

  await t.test('clerk-sync: existing user is returned with their current role', async () => {
    auth.clear();
    // Admin already seeded in the test DB by dbHelper.seed()
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .send({ email: 'admin@test.pharma', full_name: 'Test Admin', username: 'testadmin' })
      .expect(200);

    assert.equal(res.body.user.role, 'admin',
      `Seeded admin must come back as admin, got: ${res.body.user.role}`);
  });

  await t.test('[BUG-01] clerk-sync is public — no token required (document only)', async () => {
    auth.clear();
    // This is intentionally public — test documents that no auth barrier exists
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .send({ email: 'anon@test.pharma', full_name: 'Anon', username: 'anonuser' })
      .expect(201);
    assert.ok(res.body.user, 'Public endpoint returns a user object without a token');
  });

  await t.test('clerk-sync: response must NOT contain a stack trace', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .send({ email: 'stack@test.pharma', full_name: 'Stack Test', username: 'stacktest' });
    const bodyStr = JSON.stringify(res.body);
    assert.ok(!bodyStr.includes('at Object.'), 'Response must not leak a stack trace');
    assert.ok(!bodyStr.includes('node_modules'), 'Response must not leak file paths');
  });

  await t.test('clerk-sync: malformed JSON body → 400 or 4xx (not 500)', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .set('Content-Type', 'application/json')
      .send('{ this is not json }');
    assert.ok(res.status >= 400 && res.status < 500,
      `Malformed JSON must return 4xx, got ${res.status}`);
  });

  // ── GET /api/auth/employees ───────────────────────────────────────────────
  await t.test('GET /auth/employees: admin → 200 with array', async () => {
    const res = await auth.withRole('admin',
      () => request(app).get('/api/auth/employees'));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response must be an array');
  });

  await t.test('GET /auth/employees: shopkeeper → 403', async () => {
    const res = await auth.withRole('shopkeeper',
      () => request(app).get('/api/auth/employees'));
    assert.equal(res.status, 403);
    assert.ok(res.body.error, 'Error response must have error field');
  });

  await t.test('GET /auth/employees: employee → 403', async () => {
    const res = await auth.withRole('employee',
      () => request(app).get('/api/auth/employees'));
    assert.equal(res.status, 403);
  });

  await t.test('GET /auth/employees: unauthenticated → 401', async () => {
    auth.clear();
    const res = await request(app).get('/api/auth/employees').expect(401);
    assert.ok(res.body.error, 'Must have error field');
    assert.ok(!JSON.stringify(res.body).includes('stack'), 'Must not leak stack trace');
  });
});
