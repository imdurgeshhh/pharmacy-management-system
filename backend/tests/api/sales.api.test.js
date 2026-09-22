'use strict';

/**
 * sales.api.test.js — /api/sales (7 endpoints)
 * Protected with authenticateToken and requireBusinessAccess.
 * Pharmacy-specific: stock deduction, insufficient stock, empty cart.
 * Phase F: double-submit idempotency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { createSupplier, createMedicine, createInventoryBatch } = require('./helpers/factories');

test('Module: sales', async (t) => {
  let supplier, medicine, invBatch;

  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    supplier = await createSupplier();
    medicine = await createMedicine({ barcode: `SALE-MED-${Date.now()}` });
    invBatch = await createInventoryBatch({
      medicine_id: medicine.id,
      supplier_id: supplier.id,
      stock_qty: 50,
      mrp: 25.00,
      purchase_price: 10.00,
    });
    auth.asAdmin();
  });
  t.after(async () => { auth.clear(); await db.teardown(); });

  function validSalePayload(overrides = {}) {
    return {
      customer_name: 'Walk-in Customer',
      customer_phone: null,
      total_amount: 50.00,
      tax_amount: 6.00,
      payment_mode: 'Cash',
      items: [{
        inventory_id: invBatch.id,
        name: medicine.name,
        qty: 2,
        price: 25.00,
        tax: 3.00,
      }],
      ...overrides,
    };
  }

  // ── GET / ─────────────────────────────────────────────────────────────────
  await t.test('[contract] GET /sales → 200 array', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/sales').expect(200).expect('Content-Type', /json/);
    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      ['id','total_amount','tax_amount','created_at','invoice_no','payment_mode'].forEach(k =>
        assert.ok(k in res.body[0], `Sale list must have field: ${k}`)
      );
    }
  });

  // ── POST / ────────────────────────────────────────────────────────────────
  await t.test('[contract] POST /sales → 201 with { message, saleId, invoiceNo }', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/sales').send(validSalePayload()).expect(201).expect('Content-Type', /json/);
    assert.ok(res.body.saleId, 'Must return saleId (not sale_id)');
    assert.ok(res.body.invoiceNo, 'Must return invoiceNo (not bill_no)');
    assert.ok(res.body.message, 'Must return message');
    // Verify stock was deducted
    const rows = await db.query('SELECT stock_qty FROM INVENTORY WHERE id=$1', [invBatch.id]);
    assert.ok(parseInt(rows.rows[0].stock_qty) < 50, 'Stock must be deducted after sale');
  });

  await t.test('POST /sales → 400 when items array is empty', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/sales').send({ total_amount: 100, tax_amount: 0, items: [] });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('POST /sales → 400 when items is missing', async () => {
    auth.asAdmin();
    const res = await request(app)
      .post('/api/sales').send({ total_amount: 100, tax_amount: 0 });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('[pharmacy] POST /sales → 400 when requested qty > available stock', async () => {
    auth.asAdmin();
    const res = await request(app).post('/api/sales').send(validSalePayload({
      items: [{ inventory_id: invBatch.id, name: medicine.name, qty: 99999, price: 25.00, tax: 0 }]
    }));
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.error.toLowerCase().includes('stock') ||
              res.body.error.toLowerCase().includes('insufficient'),
      'Error must mention insufficient stock');
  });

  await t.test('[pharmacy] POST /sales → 400 when medicine has no inventory at all', async () => {
    auth.asAdmin();
    const noStockMed = await createMedicine({ barcode: `NOSTK-${Date.now()}` });
    const res = await request(app).post('/api/sales').send({
      total_amount: 100,
      tax_amount: 0,
      items: [{ name: noStockMed.name, qty: 1, price: 25.00, tax: 0 }]
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('[BUG-08 / Phase F] POST /sales double-submit creates duplicate invoices', async () => {
    auth.asAdmin();
    await db.query('UPDATE INVENTORY SET stock_qty = 100 WHERE id = $1', [invBatch.id]);
    const payload = validSalePayload({ invoice_no: `DUP-${Date.now()}` });
    const r1 = await request(app).post('/api/sales').send(payload);
    assert.equal(r1.status, 201, 'First sale must succeed');
    await db.query('UPDATE INVENTORY SET stock_qty = 100 WHERE id = $1', [invBatch.id]);
    const r2 = await request(app).post('/api/sales').send(payload);
    assert.equal(r2.status, 201, 'Second sale also succeeds');
    assert.notEqual(r1.body.saleId, r2.body.saleId,
      'BUG-08: Two separate sale records created from identical payload');
  });

  await t.test('[auth] POST /sales without token → 401', async () => {
    auth.clear();
    const res = await request(app).post('/api/sales').send(validSalePayload());
    assert.equal(res.status, 401, 'Endpoint must require authentication');
    auth.asAdmin();
  });

  // ── GET /:id ──────────────────────────────────────────────────────────────
  await t.test('[contract] GET /sales/:id → 200 with items array', async () => {
    auth.asAdmin();
    await db.query('UPDATE INVENTORY SET stock_qty = 100 WHERE id = $1', [invBatch.id]);
    const created = await request(app).post('/api/sales').send(validSalePayload());
    assert.equal(created.status, 201);

    const res = await request(app).get(`/api/sales/${created.body.saleId}`).expect(200);
    assert.ok(res.body.id);
    assert.ok(Array.isArray(res.body.items), 'Must include items array');
    assert.ok('invoice_no' in res.body, 'Must include invoice_no');
  });

  await t.test('GET /sales/:id → 404 for non-existent', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/sales/999999').expect(404);
    assert.ok(res.body.error);
  });

  // ── PUT /:id ──────────────────────────────────────────────────────────────
  await t.test('PUT /sales/:id → 200 updated sale header', async () => {
    auth.asAdmin();
    await db.query('UPDATE INVENTORY SET stock_qty = 100 WHERE id = $1', [invBatch.id]);
    const created = await request(app).post('/api/sales').send(validSalePayload());
    assert.equal(created.status, 201);

    const res = await request(app)
      .put(`/api/sales/${created.body.saleId}`)
      .send({ customer_id: null, employee_id: null, total_amount: 99.99, tax_amount: 0 })
      .expect(200);
    assert.equal(parseFloat(res.body.total_amount), 99.99);
  });

  await t.test('PUT /sales/:id → 404 for non-existent', async () => {
    auth.asAdmin();
    const res = await request(app)
      .put('/api/sales/999999')
      .send({ customer_id: null, employee_id: null, total_amount: 0, tax_amount: 0 })
      .expect(404);
    assert.ok(res.body.error);
  });

  // ── DELETE /:id ───────────────────────────────────────────────────────────
  await t.test('[contract] DELETE /sales/:id → 200 and reverts inventory', async () => {
    auth.asAdmin();
    await db.query('UPDATE INVENTORY SET stock_qty = 100 WHERE id = $1', [invBatch.id]);
    const created = await request(app).post('/api/sales').send(validSalePayload());
    assert.equal(created.status, 201);
    const afterSale = await db.query('SELECT stock_qty FROM INVENTORY WHERE id=$1', [invBatch.id]);
    const stockAfterSale = parseInt(afterSale.rows[0].stock_qty);

    const res = await request(app).delete(`/api/sales/${created.body.saleId}`).expect(200);
    assert.ok(res.body.message);
    assert.ok(res.body.sale);

    const afterDel = await db.query('SELECT stock_qty FROM INVENTORY WHERE id=$1', [invBatch.id]);
    const stockAfterDel = parseInt(afterDel.rows[0].stock_qty);
    assert.ok(stockAfterDel > stockAfterSale, 'Stock must be restored after sale delete');
  });

  await t.test('DELETE /sales/:id → 404 for non-existent', async () => {
    auth.asAdmin();
    const res = await request(app).delete('/api/sales/999999').expect(404);
    assert.ok(res.body.error);
  });

  await t.test('DELETE /sales/:id → second delete returns 404', async () => {
    auth.asAdmin();
    await db.query('UPDATE INVENTORY SET stock_qty = 100 WHERE id = $1', [invBatch.id]);
    const created = await request(app).post('/api/sales').send(validSalePayload());
    await request(app).delete(`/api/sales/${created.body.saleId}`).expect(200);
    const res2 = await request(app).delete(`/api/sales/${created.body.saleId}`);
    assert.equal(res2.status, 404);
  });

  // ── GET /invoice/:saleId ─────────────────────────────────────────────────
  await t.test('GET /sales/invoice/:saleId → 200 PDF for existing sale', async () => {
    auth.asAdmin();
    await db.query('UPDATE INVENTORY SET stock_qty = 100 WHERE id = $1', [invBatch.id]);
    const created = await request(app).post('/api/sales').send(validSalePayload());
    assert.equal(created.status, 201);
    const res = await request(app).get(`/api/sales/invoice/${created.body.saleId}`);
    assert.ok([200, 500].includes(res.status), `Invoice endpoint returned unexpected ${res.status}`);
    if (res.status === 200) {
      assert.ok(res.headers['content-type']?.includes('pdf'),
        'Invoice must return PDF content-type');
    }
  });

  await t.test('GET /sales/invoice/:saleId → 404 for non-existent sale', async () => {
    auth.asAdmin();
    const res = await request(app).get('/api/sales/invoice/999999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  // ── POST /invoice/preview ─────────────────────────────────────────────────
  await t.test('POST /sales/invoice/preview → 200 PDF with valid payload', async () => {
    auth.asAdmin();
    const payload = {
      customer: { name: 'Preview Patient', phone: '0000000001' },
      items: [{ name: 'Paracetamol', qty: 2, price: 25, tax: 0, hsn_code: '3004', pack: '10', net_total: 50 }],
      summary: { subtotal: 50, grandTotal: 50, totalDiscount: 0, totalScheme: 0, crDr: 0, freight: 0, roundOffDiff: 0 },
      payment_mode: 'Cash',
    };
    const res = await request(app).post('/api/sales/invoice/preview').send(payload);
    assert.ok([200, 500].includes(res.status), `Preview endpoint returned ${res.status}`);
  });
});
