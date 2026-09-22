'use strict';

/**
 * factories.js — Test data factories
 * ─────────────────────────────────────────────────────────────────────────────
 * Each factory inserts one row directly into the test DB and returns its ID
 * plus the full row. Use overrides to customise individual fields.
 *
 * Factories use timestamps in unique fields to avoid constraint conflicts
 * when multiple test files run back-to-back.
 *
 * MUST be used after testApp.js (env already loaded) and after dbHelper.seed().
 */

const { testPool } = require('./dbHelper');

let _seq = 0;
function seq() { return ++_seq; }
function uid() { return `${Date.now()}-${seq()}`; }

// ── Supplier ─────────────────────────────────────────────────────────────────

async function createSupplier(overrides = {}) {
  const n = uid();
  const defaults = {
    name: `Supplier ${n}`,
    contact_person: `Contact ${n}`,
    phone: `800${n.slice(-7)}`.slice(0, 20),
    email: `sup${n}@test.pharma`,
    address: `${n} Test Road`,
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  const res = await testPool.query(
    `INSERT INTO SUPPLIERS (name, contact_person, phone, email, address, admin_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [d.name, d.contact_person, d.phone, d.email, d.address, d.admin_id]
  );
  return res.rows[0];
}

// ── Medicine ─────────────────────────────────────────────────────────────────

async function createMedicine(overrides = {}) {
  const n = uid();
  const defaults = {
    medicine_name: `TestMed ${n}`,
    name: `TestMed ${n}`,
    brand_name: `Brand ${n}`,
    salt_composition: `Salt ${n}`,
    medicine_category: 'General',
    category: 'General',
    dosage_form: 'Tablet',
    strength: '500mg',
    barcode: `BAR-${n}`,
    description: 'Test medicine',
    schedule: 'G',
    hsn_code: '3004',
    pack_size: '10',
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  const res = await testPool.query(
    `INSERT INTO MEDICINES
       (medicine_name, name, brand_name, salt_composition, medicine_category, category,
        dosage_form, strength, barcode, description, schedule, hsn_code, pack_size, admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [d.medicine_name, d.name, d.brand_name, d.salt_composition, d.medicine_category,
     d.category, d.dosage_form, d.strength, d.barcode, d.description,
     d.schedule, d.hsn_code, d.pack_size, d.admin_id]
  );
  return res.rows[0];
}

// ── Inventory batch ───────────────────────────────────────────────────────────

async function createInventoryBatch(overrides = {}) {
  const n = uid();
  const defaults = {
    medicine_id: null,  // required override
    supplier_id: null,
    batch_number: `TEST-BATCH-${n}`,
    stock_qty: 100,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    purchase_price: 10.00,
    mrp: 25.00,
    tax_percentage: 12.00,
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  if (!d.medicine_id) throw new Error('factories.createInventoryBatch: medicine_id is required');
  const res = await testPool.query(
    `INSERT INTO INVENTORY
       (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, tax_percentage, admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [d.medicine_id, d.supplier_id, d.batch_number, d.stock_qty, d.expiry_date,
     d.purchase_price, d.mrp, d.tax_percentage, d.admin_id]
  );
  return res.rows[0];
}

// ── Customer ─────────────────────────────────────────────────────────────────

async function createCustomer(overrides = {}) {
  const n = uid();
  const defaults = {
    name: `Customer ${n}`,
    phone: `900${n.slice(-7)}`.slice(0, 20),
    email: `cust${n}@test.pharma`,
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  const res = await testPool.query(
    `INSERT INTO CUSTOMERS (name, phone, email, admin_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [d.name, d.phone, d.email, d.admin_id]
  );
  return res.rows[0];
}

// ── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Creates a purchase record + one PURCHASE_ITEM + updates INVENTORY.
 * Requires inventoryId and medicineId to already exist.
 */
async function createPurchase(overrides = {}) {
  const defaults = {
    supplier_id: null,  // required
    medicine_id: null,  // required
    batch_number: `AUTO-${uid()}`,
    qty: 10,
    price: 10.00,
    mrp: 25.00,
    tax: 0,
    total_amount: 100.00,
    tax_amount: 0,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  if (!d.supplier_id) throw new Error('factories.createPurchase: supplier_id is required');
  if (!d.medicine_id) throw new Error('factories.createPurchase: medicine_id is required');

  const client = await testPool.connect();
  try {
    await client.query('BEGIN');

    const pRes = await client.query(
      `INSERT INTO PURCHASES (supplier_id, total_amount, tax_amount, admin_id) VALUES ($1,$2,$3,$4) RETURNING id`,
      [d.supplier_id, d.total_amount, d.tax_amount, d.admin_id]
    );
    const purchaseId = pRes.rows[0].id;

    await client.query(
      `INSERT INTO PURCHASE_ITEMS (purchase_id, medicine_id, batch_number, qty, price, tax)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [purchaseId, d.medicine_id, d.batch_number, d.qty, d.price, d.tax]
    );

    // Upsert inventory
    await client.query(
      `INSERT INTO INVENTORY (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, admin_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (medicine_id, batch_number)
       DO UPDATE SET stock_qty = INVENTORY.stock_qty + $4, purchase_price=$6, mrp=$7`,
      [d.medicine_id, d.supplier_id, d.batch_number, d.qty, d.expiry_date, d.price, d.mrp, d.admin_id]
    );

    await client.query('COMMIT');
    return { purchaseId, ...d };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Sale ─────────────────────────────────────────────────────────────────────

/**
 * Creates a sale record + one SALE_ITEM + deducts INVENTORY.
 * Requires inventoryId to already exist with enough stock.
 */
async function createSale(overrides = {}) {
  const n = uid();
  const defaults = {
    inventory_id: null,  // required
    qty: 2,
    price: 25.00,
    tax: 0,
    total_amount: 50.00,
    tax_amount: 0,
    payment_mode: 'Cash',
    invoice_no: `TEST-INV-${n}`,
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  if (!d.inventory_id) throw new Error('factories.createSale: inventory_id is required');

  const client = await testPool.connect();
  try {
    await client.query('BEGIN');

    const sRes = await client.query(
      `INSERT INTO SALES (total_amount, tax_amount, payment_mode, invoice_no, admin_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [d.total_amount, d.tax_amount, d.payment_mode, d.invoice_no, d.admin_id]
    );
    const saleId = sRes.rows[0].id;

    await client.query(
      `INSERT INTO SALE_ITEMS (sale_id, inventory_id, qty, price, tax)
       VALUES ($1,$2,$3,$4,$5)`,
      [saleId, d.inventory_id, d.qty, d.price, d.tax]
    );

    await client.query(
      `UPDATE INVENTORY SET stock_qty = stock_qty - $1 WHERE id = $2`,
      [d.qty, d.inventory_id]
    );

    await client.query('COMMIT');
    return { saleId, ...d };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Wholesale Sale ────────────────────────────────────────────────────────────

async function createWholesaleSale(overrides = {}) {
  const n = uid();
  const defaults = {
    medicine_name: `WholesaleMed ${n}`,
    quantity: 50,
    price_per_unit: 20.00,
    shopkeeper_name: `Shopkeeper ${n}`,
    gst_number: null,
    sale_date: new Date().toISOString().slice(0, 10),
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  const res = await testPool.query(
    `INSERT INTO WHOLESALE_SALES (medicine_name, quantity, price_per_unit, shopkeeper_name, gst_number, sale_date, admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [d.medicine_name, d.quantity, d.price_per_unit, d.shopkeeper_name, d.gst_number, d.sale_date, d.admin_id]
  );
  return res.rows[0];
}

// ── Wholesale Purchase ────────────────────────────────────────────────────────

async function createWholesalePurchase(overrides = {}) {
  const n = uid();
  const defaults = {
    medicine_name: `WholesaleMed ${n}`,
    quantity: 100,
    price_per_unit: 12.00,
    supplier_name: `WholesaleSupplier ${n}`,
    gst_number: null,
    purchase_date: new Date().toISOString().slice(0, 10),
    admin_id: 1,
  };
  const d = { ...defaults, ...overrides };
  const res = await testPool.query(
    `INSERT INTO WHOLESALE_PURCHASES (medicine_name, quantity, price_per_unit, supplier_name, gst_number, purchase_date, admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [d.medicine_name, d.quantity, d.price_per_unit, d.supplier_name, d.gst_number, d.purchase_date, d.admin_id]
  );
  return res.rows[0];
}

module.exports = {
  createSupplier,
  createMedicine,
  createInventoryBatch,
  createCustomer,
  createPurchase,
  createSale,
  createWholesaleSale,
  createWholesalePurchase,
};
