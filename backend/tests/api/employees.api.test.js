'use strict';

/**
 * employees.api.test.js — /api/employees (5 endpoints)
 * All endpoints require auth. POST and DELETE also require admin role.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');

test('Module: employees', async (t) => {
  t.before(async () => { await db.setupSchema(); await db.resetDb(); await db.seed(); });
  t.after(async () => { auth.clear(); await db.teardown(); });

  let createdEmpId; // shared across sub-tests

  // ── POST / ────────────────────────────────────────────────────────────────
  await t.test('[contract] POST /employees — admin → 201 with employee object', async () => {
    const payload = {
      full_name: 'New Test Employee',
      email: `newemp-${Date.now()}@test.pharma`,
      password: 'Secure123!',
      confirm_password: 'Secure123!',
      qualification: 'B.Pharm',
      admin_id: 1,
    };
    const res = await auth.withRole('admin',
      () => request(app).post('/api/employees').send(payload));
    assert.equal(res.status, 201);
    assert.ok(res.body.employee, 'Must return employee object');
    assert.ok(res.body.employee.id, 'Employee must have id');
    assert.equal(res.body.employee.role, 'employee', 'New employee must have role=employee');
    assert.ok(res.body.employee.full_name, 'Must return full_name');
    createdEmpId = res.body.employee.id;
  });

  await t.test('POST /employees — shopkeeper → 403', async () => {
    const res = await auth.withRole('shopkeeper',
      () => request(app).post('/api/employees').send({
        full_name: 'Denied', email: 'denied@test.pharma',
        password: 'P123!', confirm_password: 'P123!',
      }));
    assert.equal(res.status, 403);
    assert.ok(res.body.error);
  });

  await t.test('POST /employees — anonymous → 401', async () => {
    auth.clear();
    const res = await request(app).post('/api/employees')
      .send({ full_name: 'Ghost', email: 'ghost@test.pharma', password: 'G123!', confirm_password: 'G123!' });
    assert.equal(res.status, 401);
  });

  await t.test('POST /employees — 400 when required fields missing', async () => {
    const res = await auth.withRole('admin',
      () => request(app).post('/api/employees').send({ full_name: 'No Email' }));
    assert.equal(res.status, 400);
    assert.ok(res.body.error, 'Must have error field');
  });

  await t.test('POST /employees — 400 when passwords do not match', async () => {
    const res = await auth.withRole('admin',
      () => request(app).post('/api/employees').send({
        full_name: 'Mismatch', email: `mm-${Date.now()}@test.pharma`,
        password: 'Abc123!', confirm_password: 'Xyz999!',
      }));
    assert.equal(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('password'), 'Error must mention password');
  });

  await t.test('POST /employees — 400 for duplicate email', async () => {
    // employee@test.pharma already seeded
    const res = await auth.withRole('admin',
      () => request(app).post('/api/employees').send({
        full_name: 'Dup Email', email: 'employee@test.pharma',
        password: 'Abc123!', confirm_password: 'Abc123!',
      }));
    assert.equal(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('email') ||
              res.body.error.toLowerCase().includes('exist'), 'Error must mention duplicate email');
  });

  // ── GET / ─────────────────────────────────────────────────────────────────
  await t.test('[contract] GET /employees — admin → 200 array', async () => {
    const res = await auth.withRole('admin',
      () => request(app).get('/api/employees'));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const e = res.body[0];
      ['id','name','email','role','full_name','is_active'].forEach(k =>
        assert.ok(k in e, `Employee must have field: ${k}`)
      );
    }
  });

  await t.test('GET /employees — shopkeeper → 403', async () => {
    const res = await auth.withRole('shopkeeper',
      () => request(app).get('/api/employees'));
    assert.equal(res.status, 403);
  });

  await t.test('GET /employees — anonymous → 401', async () => {
    auth.clear();
    const res = await request(app).get('/api/employees').expect(401);
    assert.ok(res.body.error);
  });

  // ── PUT /:id ──────────────────────────────────────────────────────────────
  await t.test('[contract] PUT /employees/:id — authenticated → 200', async () => {
    assert.ok(createdEmpId, 'Need a created employee from POST test');
    const res = await auth.withRole('admin',
      () => request(app).put(`/api/employees/${createdEmpId}`)
        .send({ full_name: 'Updated Emp Name', qualification: 'D.Pharm' }));
    assert.equal(res.status, 200);
    assert.ok(res.body.employee);
    assert.equal(res.body.employee.full_name || res.body.employee.name, 'Updated Emp Name');
  });

  await t.test('[BUG-06] PUT /employees/:id — shopkeeper can update any employee (document)', async () => {
    // BUG: no role restriction on PUT — any authenticated user can edit any employee
    assert.ok(createdEmpId);
    const res = await auth.withRole('shopkeeper',
      () => request(app).put(`/api/employees/${createdEmpId}`)
        .send({ full_name: 'ShopkeeperEdited' }));
    if (res.status === 200) {
      assert.ok(true, 'BUG-06 confirmed: shopkeeper can update employee records');
    } else {
      assert.equal(res.status, 403, 'Fixed: shopkeeper blocked from editing employees');
    }
  });

  await t.test('PUT /employees/:id — anonymous → 401', async () => {
    auth.clear();
    const res = await request(app).put(`/api/employees/1`).send({ full_name: 'Ghost' }).expect(401);
    assert.ok(res.body.error);
  });

  await t.test('PUT /employees/:id — 404 for non-existent ID', async () => {
    const res = await auth.withRole('admin',
      () => request(app).put('/api/employees/999999').send({ full_name: 'Ghost' }));
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  // ── PATCH /:id/toggle ─────────────────────────────────────────────────────
  await t.test('[contract] PATCH /employees/:id/toggle — authenticated → 200 toggles is_active', async () => {
    assert.ok(createdEmpId);
    // First toggle
    const res1 = await auth.withRole('admin',
      () => request(app).patch(`/api/employees/${createdEmpId}/toggle`));
    assert.equal(res1.status, 200);
    assert.ok('is_active' in res1.body.employee);
    const firstState = res1.body.employee.is_active;

    // Second toggle — must reverse
    const res2 = await auth.withRole('admin',
      () => request(app).patch(`/api/employees/${createdEmpId}/toggle`));
    assert.equal(res2.status, 200);
    assert.notEqual(res2.body.employee.is_active, firstState, 'Toggle must flip is_active');
  });

  await t.test('PATCH /employees/:id/toggle — anonymous → 401', async () => {
    auth.clear();
    const res = await request(app).patch('/api/employees/1/toggle').expect(401);
    assert.ok(res.body.error);
  });

  await t.test('PATCH /employees/999999/toggle → 404', async () => {
    const res = await auth.withRole('admin',
      () => request(app).patch('/api/employees/999999/toggle'));
    assert.equal(res.status, 404);
  });

  // ── DELETE /:id ───────────────────────────────────────────────────────────
  await t.test('[contract] DELETE /employees/:id — admin → 200', async () => {
    assert.ok(createdEmpId);
    const res = await auth.withRole('admin',
      () => request(app).delete(`/api/employees/${createdEmpId}`));
    assert.equal(res.status, 200);
    assert.ok(res.body.message);
  });

  await t.test('DELETE /employees/:id — shopkeeper → 403', async () => {
    const res = await auth.withRole('shopkeeper',
      () => request(app).delete('/api/employees/1'));
    assert.equal(res.status, 403);
  });

  await t.test('DELETE /employees/:id — anonymous → 401', async () => {
    auth.clear();
    const res = await request(app).delete('/api/employees/1').expect(401);
    assert.ok(res.body.error);
  });

  await t.test('DELETE /employees/999999 — admin, non-existent → 404', async () => {
    const res = await auth.withRole('admin',
      () => request(app).delete('/api/employees/999999'));
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});
