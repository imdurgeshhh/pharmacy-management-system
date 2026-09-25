'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createSupplier } = require('./helpers/factories');

test('Module: Strip + Loose Tablet Billing & Stock Tracking', async (t) => {
  let supplier;
  let adminId = 1;

  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    auth.asAdmin();
    supplier = await createSupplier();
  });

  t.after(async () => {
    auth.clear();
    await db.teardown();
  });

  let medId;
  let invId;

  await t.test('1. Create medicine with units_per_strip = 10 (tablets pack)', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/inventory/medicine')
      .send({
        name: 'Dolo 650 Strip Test',
        brand_name: 'Micro Labs',
        category: 'Analgesic',
        dosage_form: 'Tablet',
        strength: '650mg',
        schedule: 'NONE',
        pack_size: '10 TAB',
        units_per_strip: 10
      })
      .expect(201);

    assert.ok(res.body.id);
    assert.equal(res.body.units_per_strip, 10);
    medId = res.body.id;
  });

  await t.test('2. Purchase stock: 5 strips + 4 loose = 54 tablets', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/purchases')
      .send({
        supplier_id: supplier.id,
        total_amount: 540.00,
        tax_amount: 60.00,
        items: [{
          medicine_id: medId,
          batch_number: 'BATCH-DOLO-01',
          strips: 5,
          loose: 4,
          price: 100.00, // Rs. 100 per strip
          mrp: 120.00,   // Rs. 120 per strip MRP
          tax_percentage: 12
        }]
      })
      .expect(201);

    assert.ok(res.body.purchaseId);

    // Verify inventory stock in DB is 54 base units
    const invCheck = await db.query(
      'SELECT id, stock_qty, mrp FROM INVENTORY WHERE medicine_id = $1 AND admin_id = $2',
      [medId, adminId]
    );
    assert.equal(invCheck.rows.length, 1);
    assert.equal(parseInt(invCheck.rows[0].stock_qty, 10), 54);
    assert.equal(parseFloat(invCheck.rows[0].mrp), 120.00);
    invId = invCheck.rows[0].id;

    // Verify purchase items recorded units_per_strip, strips_qty, loose_qty
    const piCheck = await db.query(
      'SELECT qty, units_per_strip, strips_qty, loose_qty FROM PURCHASE_ITEMS WHERE purchase_id = $1',
      [res.body.purchaseId]
    );
    assert.equal(parseInt(piCheck.rows[0].qty, 10), 54);
    assert.equal(piCheck.rows[0].units_per_strip, 10);
    assert.equal(parseFloat(piCheck.rows[0].strips_qty), 5);
    assert.equal(parseInt(piCheck.rows[0].loose_qty, 10), 4);
  });

  await t.test('3. Sale in POS: Cashier sells 2 strips + 3 loose = 23 tablets', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/sales')
      .send({
        customer_name: 'Patient Raman',
        customer_phone: '9876543210',
        payment_mode: 'Cash',
        items: [{
          inventory_id: invId,
          strips: 2,
          loose: 3,
          mrp: 120.00
        }]
      })
      .expect(201);

    assert.ok(res.body.saleId);

    // Verify stock deduction: 54 - 23 = 31 tablets remaining
    const invCheck = await db.query('SELECT stock_qty FROM INVENTORY WHERE id = $1', [invId]);
    assert.equal(parseInt(invCheck.rows[0].stock_qty, 10), 31);

    // Verify sale item recorded breakdown
    const siCheck = await db.query(
      'SELECT qty, units_per_strip, strips_qty, loose_qty, price, trade_rate, net_total FROM SALE_ITEMS WHERE sale_id = $1',
      [res.body.saleId]
    );
    assert.equal(parseInt(siCheck.rows[0].qty, 10), 23);
    assert.equal(siCheck.rows[0].units_per_strip, 10);
    assert.equal(parseFloat(siCheck.rows[0].strips_qty), 2);
    assert.equal(parseInt(siCheck.rows[0].loose_qty, 10), 3);
    // Unit price = 120 / 10 = 12 per tablet (MRP). Trade rate = 100 / 10 = 10. Total = 23 * 10 = 230
    assert.equal(parseFloat(siCheck.rows[0].price), 12.00);
    assert.equal(parseFloat(siCheck.rows[0].trade_rate), 10.00);
    assert.equal(parseFloat(siCheck.rows[0].net_total), 230.00);
  });

  await t.test('4. Auto-normalization on sale: 1 strip + 15 loose -> 2 strips + 5 loose (25 tab)', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/sales')
      .send({
        customer_name: 'Patient Suresh',
        payment_mode: 'UPI',
        items: [{
          inventory_id: invId,
          strips: 1,
          loose: 15
        }]
      })
      .expect(201);

    // Stock remaining: 31 - 25 = 6 tablets
    const invCheck = await db.query('SELECT stock_qty FROM INVENTORY WHERE id = $1', [invId]);
    assert.equal(parseInt(invCheck.rows[0].stock_qty, 10), 6);

    const siCheck = await db.query(
      'SELECT qty, strips_qty, loose_qty FROM SALE_ITEMS WHERE sale_id = $1',
      [res.body.saleId]
    );
    assert.equal(parseInt(siCheck.rows[0].qty, 10), 25);
    assert.equal(parseFloat(siCheck.rows[0].strips_qty), 2);
    assert.equal(parseInt(siCheck.rows[0].loose_qty, 10), 5);
  });

  await t.test('5. Insufficient stock guard: selling 1 strip (10 tab) when only 6 remain -> 400 Bad Request', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/sales')
      .send({
        customer_name: 'Greedy Customer',
        items: [{
          inventory_id: invId,
          strips: 1,
          loose: 0
        }]
      })
      .expect(400);

    assert.ok(res.body.error.toLowerCase().includes('insufficient stock'));

    // Stock must remain intact at 6
    const invCheck = await db.query('SELECT stock_qty FROM INVENTORY WHERE id = $1', [invId]);
    assert.equal(parseInt(invCheck.rows[0].stock_qty, 10), 6);
  });

  await t.test('6. Guard: cannot change units_per_strip without confirmation when active stock exists', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put(`/api/inventory/medicine/${medId}`)
      .send({
        units_per_strip: 15
      })
      .expect(400);

    assert.ok(res.body.error.toLowerCase().includes('confirm_pack_size_change'));

    // With explicit confirmation, it succeeds
    const confirmRes = await request(app)
      .put(`/api/inventory/medicine/${medId}`)
      .send({
        units_per_strip: 15,
        confirm_pack_size_change: true
      })
      .expect(200);

    assert.equal(confirmRes.body.units_per_strip, 15);
  });

  await t.test('7. Single-unit medicine (units_per_strip = 1, e.g. syrup)', async () => {
    auth.asAdmin();
    const medRes = await request(app)
      .post('/api/inventory/medicine')
      .send({
        name: 'Cough Syrup 100ml',
        dosage_form: 'Syrup',
        units_per_strip: 1
      })
      .expect(201);

    const syrupId = medRes.body.id;

    // Purchase 10 bottles
    await request(app)
      .post('/api/purchases')
      .send({
        supplier_id: supplier.id,
        total_amount: 500.00,
        tax_amount: 0,
        items: [{
          medicine_id: syrupId,
          qty: 10,
          price: 50.00,
          mrp: 65.00
        }]
      })
      .expect(201);

    const syrupInv = await db.query('SELECT id, stock_qty FROM INVENTORY WHERE medicine_id = $1', [syrupId]);
    assert.equal(parseInt(syrupInv.rows[0].stock_qty, 10), 10);

    // Sell 3 bottles
    await request(app)
      .post('/api/sales')
      .send({
        items: [{
          inventory_id: syrupInv.rows[0].id,
          qty: 3
        }]
      })
      .expect(201);

    const afterSale = await db.query('SELECT stock_qty FROM INVENTORY WHERE medicine_id = $1', [syrupId]);
    assert.equal(parseInt(afterSale.rows[0].stock_qty, 10), 7);
  });
});
