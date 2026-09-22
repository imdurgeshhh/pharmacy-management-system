'use strict';

/**
 * security_multitenant_isolation.api.test.js
 * Comprehensive Multi-Tenant Ownership, RBAC, IDOR & Clerk Security Verification
 *
 * Covers:
 *  1. Multi-Admin coexistence & self-registration
 *  2. Admin-provisioned Shopkeepers with Clerk SDK
 *  3. Zero plaintext password verification
 *  4. Fail-closed unassigned Shopkeeper protection
 *  5. Data isolation across inventory, sales, customers, suppliers, employees, reports
 *  6. IDOR protections (404 on cross-tenant resource access)
 *  7. Backend-enforced authorization (anti-spoofing client admin_id)
 *  8. Admin-only reports enforcement (403 for Shopkeepers)
 *  9. Deactivated account enforcement
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');

test('Security Suite: Multi-Tenant RBAC & Data Isolation', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
  });

  t.after(async () => {
    auth.clear();
    await db.teardown();
  });

  let adminA_Id = 1;
  let adminB_Id = 4;
  let shopkeeperA_Id = 2;
  let shopkeeperB_Id = 5;

  let medicineA_Id;
  let medicineB_Id;
  let customerA_Id;
  let customerB_Id;
  let supplierA_Id;
  let supplierB_Id;
  let saleA_Id;

  // ───────────────────────────────────────────────────────────────────────────
  // 1 & 2: Multi-Admin Self-Registration via Clerk Sync
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('1. Admin A self-registration via clerk-sync sets role=admin and admin_id=null', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .send({
        email: 'admin_brand_new_a@test.pharma',
        full_name: 'Admin Alpha Owner',
        username: 'admin_alpha_owner'
      })
      .expect(201);

    assert.equal(res.body.user.role, 'admin');
    assert.equal(res.body.user.email, 'admin_brand_new_a@test.pharma');

    const dbUser = await db.query(
      'SELECT role, admin_id, password FROM EMPLOYEES WHERE email = $1',
      ['admin_brand_new_a@test.pharma']
    );
    assert.equal(dbUser.rows[0].role, 'admin');
    assert.equal(dbUser.rows[0].admin_id, null);
    assert.equal(dbUser.rows[0].password, null);
  });

  await t.test('2. Admin B self-registration via clerk-sync sets role=admin and admin_id=null', async () => {
    auth.clear();
    const res = await request(app)
      .post('/api/auth/clerk-sync')
      .send({
        email: 'admin_brand_new_b@test.pharma',
        full_name: 'Admin Beta Owner',
        username: 'admin_beta_owner'
      })
      .expect(201);

    assert.equal(res.body.user.role, 'admin');
    assert.equal(res.body.user.email, 'admin_brand_new_b@test.pharma');

    const dbUser = await db.query(
      'SELECT role, admin_id, password FROM EMPLOYEES WHERE email = $1',
      ['admin_brand_new_b@test.pharma']
    );
    assert.equal(dbUser.rows[0].role, 'admin');
    assert.equal(dbUser.rows[0].admin_id, null);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3 & 4: Admin Creates Shopkeepers via Clerk SDK + Zero Plaintext Password
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('3. Admin A creates Shopkeeper A via POST /api/employees/shopkeeper', async () => {
    auth.asAdminA();
    const res = await request(app)
      .post('/api/employees/shopkeeper')
      .send({
        email: 'shopkeeper_alpha_new@test.pharma',
        password: 'Password123!',
        full_name: 'Alpha Shopkeeper One',
        mobile_no: '9876543210',
        qualification: 'B.Pharm'
      })
      .expect(201);

    assert.equal(res.body.employee.role, 'shopkeeper');
    assert.equal(res.body.employee.email, 'shopkeeper_alpha_new@test.pharma');
    assert.equal(res.body.employee.admin_id, adminA_Id);
    assert.equal(res.body.employee.password, undefined, 'Password must never be returned');

    // DB inspection: password must be NULL
    const checkDb = await db.query('SELECT * FROM EMPLOYEES WHERE email = $1', ['shopkeeper_alpha_new@test.pharma']);
    assert.equal(checkDb.rows.length, 1);
    assert.equal(checkDb.rows[0].password, null, 'Password in DB must be NULL (handled by Clerk)');
    assert.equal(checkDb.rows[0].admin_id, adminA_Id);
    auth.clear();
  });

  await t.test('4. Admin B creates Shopkeeper B via POST /api/employees/shopkeeper', async () => {
    auth.asAdminB();
    const res = await request(app)
      .post('/api/employees/shopkeeper')
      .send({
        email: 'shopkeeper_beta_new@test.pharma',
        password: 'Password123!',
        full_name: 'Beta Shopkeeper One',
        mobile_no: '9876543211',
        qualification: 'D.Pharm'
      })
      .expect(201);

    assert.equal(res.body.employee.role, 'shopkeeper');
    assert.equal(res.body.employee.admin_id, adminB_Id);
    assert.equal(res.body.employee.password, undefined, 'Password must never be returned');

    const checkDb = await db.query('SELECT * FROM EMPLOYEES WHERE email = $1', ['shopkeeper_beta_new@test.pharma']);
    assert.equal(checkDb.rows[0].password, null);
    assert.equal(checkDb.rows[0].admin_id, adminB_Id);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5: Shopkeeper Cannot Create Another Shopkeeper
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('5. Shopkeeper A cannot call POST /api/employees/shopkeeper (403 Forbidden)', async () => {
    auth.asShopkeeperA();
    const res = await request(app)
      .post('/api/employees/shopkeeper')
      .send({
        email: 'illegal_shopkeeper@test.pharma',
        password: 'Password123!',
        full_name: 'Illegal Shopkeeper'
      })
      .expect(403);

    assert.match(res.body.error, /admin/i);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6: Unassigned Shopkeeper Handling (Fail-Closed)
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('6. Unassigned Shopkeeper is rejected with 403 on all business endpoints', async () => {
    auth.asUnassignedShopkeeper();

    await request(app).get('/api/inventory').expect(403);
    await request(app).get('/api/sales').expect(403);
    await request(app).get('/api/customers').expect(403);
    await request(app).get('/api/suppliers').expect(403);
    await request(app).get('/api/wholesale/sales').expect(403);
    await request(app).get('/api/store').expect(403);

    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7 & 8: Data Creation Scoped by Tenant (Inventory / Medicines)
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('7. Admin A creates Medicine A -> stored with admin_id = Admin A', async () => {
    auth.asAdminA();
    const res = await request(app)
      .post('/api/inventory/medicine')
      .send({
        medicine_name: 'Medicine Alpha Tenant A',
        brand_name: 'AlphaBrand',
        salt_composition: 'AlphaSalt',
        medicine_category: 'General',
        dosage_form: 'Tablet',
        strength: '500mg',
        schedule: 'NONE'
      })
      .expect(201);

    medicineA_Id = res.body.id;
    assert.ok(medicineA_Id);

    const check = await db.query('SELECT admin_id FROM MEDICINES WHERE id = $1', [medicineA_Id]);
    assert.equal(check.rows[0].admin_id, adminA_Id);

    // Create corresponding inventory batch
    await db.query(
      `INSERT INTO INVENTORY (medicine_id, batch_number, stock_qty, mrp, purchase_price, expiry_date, admin_id)
       VALUES ($1, 'BATCH-A-01', 100, 150.00, 100.00, '2028-12-31', $2)`,
      [medicineA_Id, adminA_Id]
    );

    auth.clear();
  });

  await t.test('8. Admin B creates Medicine B -> stored with admin_id = Admin B', async () => {
    auth.asAdminB();
    const res = await request(app)
      .post('/api/inventory/medicine')
      .send({
        medicine_name: 'Medicine Beta Tenant B',
        brand_name: 'BetaBrand',
        salt_composition: 'BetaSalt',
        medicine_category: 'General',
        dosage_form: 'Syrup',
        strength: '250mg',
        schedule: 'NONE'
      })
      .expect(201);

    medicineB_Id = res.body.id;
    assert.ok(medicineB_Id);

    const check = await db.query('SELECT admin_id FROM MEDICINES WHERE id = $1', [medicineB_Id]);
    assert.equal(check.rows[0].admin_id, adminB_Id);

    // Create corresponding inventory batch
    await db.query(
      `INSERT INTO INVENTORY (medicine_id, batch_number, stock_qty, mrp, purchase_price, expiry_date, admin_id)
       VALUES ($1, 'BATCH-B-01', 50, 200.00, 130.00, '2028-12-31', $2)`,
      [medicineB_Id, adminB_Id]
    );

    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9 & 10: Admin Inventory List Data Isolation
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('9. Admin A lists inventory -> sees Medicine A, does NOT see Medicine B', async () => {
    auth.asAdminA();
    const res = await request(app).get('/api/inventory').expect(200);
    const names = res.body.map(item => item.name);

    assert.ok(names.includes('Medicine Alpha Tenant A'));
    assert.ok(!names.includes('Medicine Beta Tenant B'), 'Admin A must never see Medicine B');
    auth.clear();
  });

  await t.test('10. Admin B lists inventory -> sees Medicine B, does NOT see Medicine A', async () => {
    auth.asAdminB();
    const res = await request(app).get('/api/inventory').expect(200);
    const names = res.body.map(item => item.name);

    assert.ok(names.includes('Medicine Beta Tenant B'));
    assert.ok(!names.includes('Medicine Alpha Tenant A'), 'Admin B must never see Medicine A');
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11 & 12: Shopkeeper Inventory List Data Isolation
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('11. Shopkeeper A lists inventory -> sees Medicine A, does NOT see Medicine B', async () => {
    auth.asShopkeeperA();
    const res = await request(app).get('/api/inventory').expect(200);
    const names = res.body.map(item => item.name);

    assert.ok(names.includes('Medicine Alpha Tenant A'));
    assert.ok(!names.includes('Medicine Beta Tenant B'), 'Shopkeeper A must never see Medicine B');
    auth.clear();
  });

  await t.test('12. Shopkeeper B lists inventory -> sees Medicine B, does NOT see Medicine A', async () => {
    auth.asShopkeeperB();
    const res = await request(app).get('/api/inventory').expect(200);
    const names = res.body.map(item => item.name);

    assert.ok(names.includes('Medicine Beta Tenant B'));
    assert.ok(!names.includes('Medicine Alpha Tenant A'), 'Shopkeeper B must never see Medicine A');
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 13 & 14: IDOR Protection on Inventory
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('13. IDOR: Admin A accessing Medicine B returns 404 Not Found', async () => {
    auth.asAdminA();
    await request(app).get(`/api/inventory/${medicineB_Id}`).expect(404);
    await request(app).put(`/api/inventory/${medicineB_Id}`).send({ name: 'Hacked' }).expect(404);
    await request(app).delete(`/api/inventory/${medicineB_Id}`).expect(404);
    auth.clear();
  });

  await t.test('14. IDOR: Shopkeeper A accessing Medicine B returns 404 Not Found', async () => {
    auth.asShopkeeperA();
    await request(app).get(`/api/inventory/${medicineB_Id}`).expect(404);
    // Shopkeeper cannot delete even their own medicine (403 adminOnly)
    await request(app).delete(`/api/inventory/${medicineA_Id}`).expect(403);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 15: Sales Creation & Cross-Tenant Validation
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('15. Shopkeeper A creates Sale with Medicine A (scoped to Admin A)', async () => {
    auth.asShopkeeperA();
    const invRes = await db.query('SELECT id FROM INVENTORY WHERE medicine_id = $1', [medicineA_Id]);
    const inventoryId = invRes.rows[0].id;

    const res = await request(app)
      .post('/api/sales')
      .send({
        customer_name: 'Walk-in Customer A',
        customer_phone: '9999900001',
        payment_mode: 'cash',
        total_amount: 300.00,
        tax_amount: 36.00,
        items: [
          {
            inventory_id: inventoryId,
            qty: 2,
            quantity: 2,
            price: 150.00,
            unit_price: 150.00
          }
        ]
      })
      .expect(201);

    saleA_Id = res.body.sale?.id || res.body.saleId;
    assert.ok(saleA_Id);

    const saleCheck = await db.query('SELECT admin_id FROM SALES WHERE id = $1', [saleA_Id]);
    assert.equal(saleCheck.rows[0].admin_id, adminA_Id);
    auth.clear();
  });

  await t.test('15b. Shopkeeper A cannot sell Medicine B (cross-tenant inventory blocked)', async () => {
    auth.asShopkeeperA();
    const invBRes = await db.query('SELECT id FROM INVENTORY WHERE medicine_id = $1', [medicineB_Id]);
    const inventoryBId = invBRes.rows[0].id;

    const res = await request(app)
      .post('/api/sales')
      .send({
        customer_name: 'Cross Tenant Attempt',
        customer_phone: '9999900002',
        payment_mode: 'cash',
        items: [
          {
            inventory_id: inventoryBId,
            quantity: 1,
            unit_price: 200.00
          }
        ]
      });

    assert.ok([400, 404].includes(res.status), `Must reject cross-tenant item with 400 or 404, got ${res.status}`);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 16 & 17: Sales List & IDOR Protection (Invoice PDF)
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('16. Shopkeeper B lists sales -> does NOT include Sale A', async () => {
    auth.asShopkeeperB();
    const res = await request(app).get('/api/sales').expect(200);
    const saleIds = res.body.map(s => s.id);

    assert.ok(!saleIds.includes(saleA_Id), 'Shopkeeper B must not see Sale A in sales list');
    auth.clear();
  });

  await t.test('17. IDOR: Shopkeeper B accessing Sale A or its PDF returns 404 Not Found', async () => {
    auth.asShopkeeperB();
    await request(app).get(`/api/sales/${saleA_Id}`).expect(404);
    await request(app).get(`/api/sales/invoice/${saleA_Id}`).expect(404);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 18 & 19: Reports are Admin-Only
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('18. Shopkeeper A cannot access GET /api/reports/dashboard (403 Forbidden)', async () => {
    auth.asShopkeeperA();
    const res = await request(app).get('/api/reports/dashboard').expect(403);
    assert.match(res.body.error, /admin/i);
    auth.clear();
  });

  await t.test('19. Shopkeeper A cannot access GET /api/reports/sales (403 Forbidden)', async () => {
    auth.asShopkeeperA();
    const res = await request(app).get('/api/reports/sales').expect(403);
    assert.match(res.body.error, /admin/i);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 20 & 21: Reports Dashboard Stats Scoped by Tenant
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('20. Admin A sees dashboard stats reflecting Admin A revenue', async () => {
    auth.asAdminA();
    const res = await request(app).get('/api/reports/dashboard').expect(200);

    assert.ok(res.body.todaySales > 0, 'Admin A dashboard should include Sale A');
    auth.clear();
  });

  await t.test('21. Admin B sees dashboard stats isolated (todaySales = 0, no leak from Admin A)', async () => {
    auth.asAdminB();
    const res = await request(app).get('/api/reports/dashboard').expect(200);

    assert.equal(res.body.todaySales, 0, 'Admin B todaySales must not include Admin A sales');
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 22 & 23: Employee List Isolation
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('22. Admin A lists employees -> sees Shopkeeper A, does NOT see Shopkeeper B', async () => {
    auth.asAdminA();
    const res = await request(app).get('/api/employees').expect(200);
    const emails = res.body.map(e => e.email);

    assert.ok(emails.includes('shopkeeper@test.pharma'));
    assert.ok(!emails.includes('shopkeeper_b@test.pharma'));
    auth.clear();
  });

  await t.test('23. Admin B lists employees -> sees Shopkeeper B, does NOT see Shopkeeper A', async () => {
    auth.asAdminB();
    const res = await request(app).get('/api/employees').expect(200);
    const emails = res.body.map(e => e.email);

    assert.ok(emails.includes('shopkeeper_b@test.pharma'));
    assert.ok(!emails.includes('shopkeeper@test.pharma'));
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 24, 25, 26: Employee IDOR Protection
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('24. IDOR: Admin A cannot update Admin B shopkeeper (404 Not Found)', async () => {
    auth.asAdminA();
    await request(app)
      .put(`/api/employees/${shopkeeperB_Id}`)
      .send({ full_name: 'Hacked Shopkeeper' })
      .expect(404);
    auth.clear();
  });

  await t.test('25. IDOR: Admin A cannot delete Admin B shopkeeper (404 Not Found)', async () => {
    auth.asAdminA();
    await request(app).delete(`/api/employees/${shopkeeperB_Id}`).expect(404);
    auth.clear();
  });

  await t.test('26. IDOR: Admin A cannot toggle active status of Admin B shopkeeper (404 Not Found)', async () => {
    auth.asAdminA();
    await request(app).patch(`/api/employees/${shopkeeperB_Id}/toggle`).expect(404);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 27: Suppliers Isolation & IDOR
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('27. Suppliers are isolated between Admin A and Admin B with IDOR protection', async () => {
    auth.asAdminA();
    const supARes = await request(app)
      .post('/api/suppliers')
      .send({ name: 'Alpha Pharma Supplies', phone: '9111111111' })
      .expect(201);
    supplierA_Id = supARes.body.id;

    auth.asAdminB();
    const supBRes = await request(app)
      .post('/api/suppliers')
      .send({ name: 'Beta Pharma Supplies', phone: '9222222222' })
      .expect(201);
    supplierB_Id = supBRes.body.id;

    // Admin A cannot see Supplier B
    auth.asAdminA();
    const listA = await request(app).get('/api/suppliers').expect(200);
    const namesA = listA.body.map(s => s.name);
    assert.ok(namesA.includes('Alpha Pharma Supplies'));
    assert.ok(!namesA.includes('Beta Pharma Supplies'));

    // Admin A IDOR on Supplier B
    await request(app).get(`/api/suppliers/${supplierB_Id}`).expect(404);
    await request(app).delete(`/api/suppliers/${supplierB_Id}`).expect(404);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 28: Customers Isolation & IDOR
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('28. Customers are isolated between Admin A and Admin B with IDOR protection', async () => {
    auth.asAdminA();
    const cusARes = await request(app)
      .post('/api/customers')
      .send({ name: 'Customer Alpha', phone: '9333333331' })
      .expect(201);
    customerA_Id = cusARes.body.id;

    auth.asAdminB();
    const cusBRes = await request(app)
      .post('/api/customers')
      .send({ name: 'Customer Beta', phone: '9333333332' })
      .expect(201);
    customerB_Id = cusBRes.body.id;

    // Admin A cannot see Customer B
    auth.asAdminA();
    const listA = await request(app).get('/api/customers').expect(200);
    const namesA = listA.body.map(c => c.name);
    assert.ok(namesA.includes('Customer Alpha'));
    assert.ok(!namesA.includes('Customer Beta'));

    // Admin A IDOR on Customer B
    await request(app).get(`/api/customers/${customerB_Id}`).expect(404);
    await request(app).delete(`/api/customers/${customerB_Id}`).expect(404);
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 29: Client-Supplied admin_id is Strictly Ignored (Anti-Spoofing)
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('29. Server ignores client-supplied admin_id and sets req.adminId exclusively', async () => {
    auth.asAdminA();
    const res = await request(app)
      .post('/api/customers')
      .send({
        name: 'Spoofed Customer',
        phone: '9444444444',
        admin_id: 99999 // Malicious client attempt
      })
      .expect(201);

    const saved = await db.query('SELECT admin_id FROM CUSTOMERS WHERE id = $1', [res.body.id]);
    assert.equal(saved.rows[0].admin_id, adminA_Id, 'Must be set to authenticated admin ID (1), NOT spoofed (99999)');
    auth.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 30: Zero Plaintext Password Storage Verification
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('30. Zero Plaintext Password: DB query verifies password IS NULL for Clerk accounts', async () => {
    const res = await db.query(
      `SELECT email, password FROM EMPLOYEES WHERE email IN ($1, $2)`,
      ['shopkeeper_alpha_new@test.pharma', 'shopkeeper_beta_new@test.pharma']
    );

    assert.equal(res.rows.length, 2);
    for (const row of res.rows) {
      assert.equal(row.password, null, `Password for ${row.email} must be NULL in DB`);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 31: Deactivated User Enforcement
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('31. Deactivated employee / shopkeeper is rejected with 403 Forbidden', async () => {
    // Deactivate Shopkeeper A in database
    await db.query('UPDATE EMPLOYEES SET is_active = FALSE WHERE id = $1', [shopkeeperA_Id]);

    auth.asShopkeeperA();
    const res = await request(app).get('/api/inventory').expect(403);
    assert.match(res.body.error, /deactivated/i);

    // Re-activate for clean state
    await db.query('UPDATE EMPLOYEES SET is_active = TRUE WHERE id = $1', [shopkeeperA_Id]);
    auth.clear();
  });
});
