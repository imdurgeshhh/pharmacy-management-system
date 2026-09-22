'use strict';

/**
 * dbHelper.js — Test database lifecycle management
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   - resetDb()   truncate all tables in dependency order
 *   - seed()      insert minimal, deterministic test data
 *   - teardown()  close the pg pool
 *   - setupSchema() create tables if they don't exist (idempotent, test DB only)
 *
 * All operations run against the database named in .env.test. The safety
 * guard in testApp.js ensures this is never the production DB. An additional
 * guard here prevents accidental imports without testApp.js being loaded first.
 *
 * IMPORTANT: Import testApp.js BEFORE dbHelper.js so the env is loaded.
 */

const { Pool } = require('pg');
const path = require('path');

// Guard: only operate if DB_NAME contains "test"
const dbName = process.env.DB_NAME || '';
if (!dbName.toLowerCase().includes('test')) {
  process.stderr.write(`[ABORT] dbHelper.js: DB_NAME="${dbName}" does not contain "test". Refusing to proceed.\n`);
  process.exit(1);
}

// Create a dedicated pool for test lifecycle operations
const testPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
  max: 5,
  allowExitOnIdle: true,
});

// ── Seeded roles and emails (must match authHelper.js IDENTITIES) ─────────────
const SEED_EMPLOYEES = [
  {
    name: 'Test Admin',
    username: 'testadmin',
    email: 'admin@test.pharma',
    password: 'testpass',
    role: 'admin',
    auth_provider: 'clerk',
    admin_id: null,
  },
  {
    name: 'Test Shopkeeper',
    username: 'testshopkeeper',
    email: 'shopkeeper@test.pharma',
    password: 'testpass',
    role: 'shopkeeper',
    auth_provider: 'clerk',
    admin_id: 1,
  },
  {
    name: 'Test Employee',
    username: 'testemployee',
    email: 'employee@test.pharma',
    password: 'testpass',
    role: 'employee',
    auth_provider: 'clerk',
    admin_id: 1,
  },
  {
    name: 'Test Admin B',
    username: 'testadmin_b',
    email: 'admin_b@test.pharma',
    password: 'testpass',
    role: 'admin',
    auth_provider: 'clerk',
    admin_id: null,
  },
  {
    name: 'Test Shopkeeper B',
    username: 'testshopkeeper_b',
    email: 'shopkeeper_b@test.pharma',
    password: 'testpass',
    role: 'shopkeeper',
    auth_provider: 'clerk',
    admin_id: 4,
  },
  {
    name: 'Test Unassigned Shopkeeper',
    username: 'testunassigned_shop',
    email: 'unassigned@test.pharma',
    password: 'testpass',
    role: 'shopkeeper',
    auth_provider: 'clerk',
    admin_id: null,
  },
];

/**
 * Create all tables in the test DB if they don't exist.
 * Safe to call multiple times (uses IF NOT EXISTS).
 * Mirrors the schema from setup_db.js.
 */
async function setupSchema() {
  const client = await testPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS EMPLOYEES (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(20) NOT NULL DEFAULT 'employee',
        email VARCHAR(255),
        employee_id VARCHAR(20) UNIQUE,
        qualification TEXT,
        address TEXT,
        mobile_no VARCHAR(20),
        aadhar_number VARCHAR(20),
        admin_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        auth_provider VARCHAR(20) DEFAULT 'local',
        clerk_user_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE EMPLOYEES ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255);

      CREATE TABLE IF NOT EXISTS CUSTOMERS (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE,
        email VARCHAR(100),
        credit_balance NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE CUSTOMERS ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS SUPPLIERS (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100),
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE SUPPLIERS ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS MEDICINES (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        medicine_name VARCHAR(100),
        name VARCHAR(100),
        brand_name VARCHAR(100),
        salt_composition VARCHAR(200),
        medicine_category VARCHAR(50),
        category VARCHAR(50),
        dosage_form VARCHAR(50),
        strength VARCHAR(50),
        barcode VARCHAR(50) UNIQUE,
        description TEXT,
        schedule VARCHAR(10) DEFAULT 'NONE',
        hsn_code VARCHAR(20) DEFAULT '3004',
        pack_size VARCHAR(20) DEFAULT '1',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE MEDICINES ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS INVENTORY (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        medicine_id INT REFERENCES MEDICINES(id) ON DELETE CASCADE,
        supplier_id INT REFERENCES SUPPLIERS(id) ON DELETE SET NULL,
        batch_number VARCHAR(50) NOT NULL,
        stock_qty INT NOT NULL DEFAULT 0,
        expiry_date DATE NOT NULL,
        purchase_price DECIMAL(10,2) NOT NULL,
        mrp DECIMAL(10,2) NOT NULL,
        tax_percentage DECIMAL(5,2) DEFAULT 0.00,
        trade_rate DECIMAL(10,2),
        old_mrp DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(medicine_id, batch_number)
      );
      ALTER TABLE INVENTORY ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS PURCHASES (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        supplier_id INT REFERENCES SUPPLIERS(id) ON DELETE SET NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE PURCHASES ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS PURCHASE_ITEMS (
        id SERIAL PRIMARY KEY,
        purchase_id INT REFERENCES PURCHASES(id) ON DELETE CASCADE,
        medicine_id INT REFERENCES MEDICINES(id) ON DELETE CASCADE,
        batch_number VARCHAR(50) NOT NULL,
        qty INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS SALES (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        customer_id INT REFERENCES CUSTOMERS(id) ON DELETE SET NULL,
        employee_id INT REFERENCES EMPLOYEES(id) ON DELETE SET NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(20) DEFAULT 'Cash',
        invoice_no VARCHAR(50),
        sub_total DECIMAL(12,2),
        discount_amount DECIMAL(12,2) DEFAULT 0,
        scheme_amount DECIMAL(12,2) DEFAULT 0,
        cr_dr_amount DECIMAL(12,2) DEFAULT 0,
        freight_amount DECIMAL(12,2) DEFAULT 0,
        round_off DECIMAL(12,2) DEFAULT 0,
        doctor_name VARCHAR(100),
        rx_number VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE SALES ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS SALE_ITEMS (
        id SERIAL PRIMARY KEY,
        sale_id INT REFERENCES SALES(id) ON DELETE CASCADE,
        inventory_id INT REFERENCES INVENTORY(id) ON DELETE SET NULL,
        qty INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0,
        free_qty INT DEFAULT 0,
        trade_rate DECIMAL(10,2),
        scheme_pct DECIMAL(5,2) DEFAULT 0,
        discount_pct DECIMAL(5,2) DEFAULT 0,
        net_rate DECIMAL(10,2),
        net_total DECIMAL(10,2),
        old_mrp DECIMAL(10,2) DEFAULT 0,
        hsn_code VARCHAR(20) DEFAULT '3004',
        pack VARCHAR(20) DEFAULT '1'
      );

      CREATE TABLE IF NOT EXISTS WHOLESALE_SALES (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        medicine_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price_per_unit NUMERIC(12,2) NOT NULL,
        total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
        gst_number VARCHAR(20),
        shopkeeper_name VARCHAR(255) NOT NULL,
        sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE WHOLESALE_SALES ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS WHOLESALE_PURCHASES (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        medicine_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price_per_unit NUMERIC(12,2) NOT NULL,
        total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
        gst_number VARCHAR(20),
        supplier_name VARCHAR(255) NOT NULL,
        purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE WHOLESALE_PURCHASES ADD COLUMN IF NOT EXISTS admin_id INTEGER;

      CREATE TABLE IF NOT EXISTS STORE_SETTINGS (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER UNIQUE,
        shop_name VARCHAR(255),
        address TEXT,
        gstin VARCHAR(20),
        phone VARCHAR(20),
        dl_no VARCHAR(50),
        pan_no VARCHAR(20),
        aadhar_no VARCHAR(20),
        food_lic_no VARCHAR(50),
        email VARCHAR(100),
        pharmacist_name VARCHAR(150),
        pharmacist_reg_no VARCHAR(100),
        updated_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE STORE_SETTINGS ADD COLUMN IF NOT EXISTS admin_id INTEGER;
      ALTER TABLE STORE_SETTINGS ADD COLUMN IF NOT EXISTS pharmacist_name VARCHAR(150);
      ALTER TABLE STORE_SETTINGS ADD COLUMN IF NOT EXISTS pharmacist_reg_no VARCHAR(100);
      ALTER TABLE STORE_SETTINGS ADD COLUMN IF NOT EXISTS updated_by INTEGER;
      ALTER TABLE STORE_SETTINGS ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'store_settings_admin_id_key'
        ) THEN
          DELETE FROM STORE_SETTINGS a
          USING STORE_SETTINGS b
          WHERE a.admin_id = b.admin_id AND a.id < b.id AND a.admin_id IS NOT NULL;
          ALTER TABLE STORE_SETTINGS ADD CONSTRAINT store_settings_admin_id_key UNIQUE (admin_id);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS ALERTS (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        type VARCHAR(50) NOT NULL,
        medicine_id INT REFERENCES MEDICINES(id) ON DELETE CASCADE,
        inventory_id INT REFERENCES INVENTORY(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE ALERTS ADD COLUMN IF NOT EXISTS admin_id INTEGER;
    `);
    console.log(`[dbHelper] Schema verified/created in "${dbName}"`);
  } finally {
    client.release();
  }
}

/**
 * Truncate all test tables in reverse dependency order.
 * Runs TRUNCATE ... RESTART IDENTITY CASCADE for a clean slate.
 */
async function resetDb() {
  await testPool.query(`
    TRUNCATE
      SALE_ITEMS,
      SALES,
      PURCHASE_ITEMS,
      PURCHASES,
      INVENTORY,
      MEDICINES,
      WHOLESALE_SALES,
      WHOLESALE_PURCHASES,
      CUSTOMERS,
      SUPPLIERS,
      EMPLOYEES,
      STORE_SETTINGS
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Insert minimal, deterministic seed data:
 *   - 3 employees (admin, shopkeeper, employee)
 *   - 1 supplier
 *   - 2 medicines with inventory batches
 *
 * Returns IDs for use by factories/tests.
 */
async function seed() {
  // Seed employees — emails must match authHelper.js IDENTITIES
  for (const emp of SEED_EMPLOYEES) {
    await testPool.query(
      `INSERT INTO EMPLOYEES (name, full_name, username, email, password, role, auth_provider, admin_id, is_active)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (username) DO UPDATE SET email=$3, role=$5, admin_id=$7`,
      [emp.name, emp.username, emp.email, emp.password, emp.role, emp.auth_provider, emp.admin_id]
    );
  }

  // Seed supplier
  const supRes = await testPool.query(
    `INSERT INTO SUPPLIERS (name, contact_person, phone, email, address, admin_id)
     VALUES ('Test Supplier Ltd', 'Test Contact', '9900000001', 'sup@test.pharma', '1 Supplier Road', 1)
     RETURNING id`
  );
  const supplierId = supRes.rows[0].id;

  // Seed medicine 1 (with stock)
  const med1Res = await testPool.query(
    `INSERT INTO MEDICINES (medicine_name, name, brand_name, salt_composition, medicine_category, category, dosage_form, strength, barcode, description, schedule, hsn_code, pack_size, admin_id)
     VALUES ('Paracetamol 500mg', 'Paracetamol 500mg', 'Calpol', 'Paracetamol', 'Analgesic', 'Analgesic', 'Tablet', '500mg', 'TEST-PARA-001', 'Test medicine', 'G', '3004', '10', 1)
     RETURNING id`
  );
  const med1Id = med1Res.rows[0].id;

  const inv1Res = await testPool.query(
    `INSERT INTO INVENTORY (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, tax_percentage, admin_id)
     VALUES ($1, $2, 'BATCH-T001', 100, CURRENT_DATE + INTERVAL '1 year', 5.00, 25.00, 12.00, 1)
     RETURNING id`,
    [med1Id, supplierId]
  );
  const inv1Id = inv1Res.rows[0].id;

  // Seed medicine 2 (low stock — triggers alert)
  const med2Res = await testPool.query(
    `INSERT INTO MEDICINES (medicine_name, name, brand_name, salt_composition, medicine_category, category, dosage_form, strength, barcode, description, schedule, hsn_code, pack_size, admin_id)
     VALUES ('Amoxicillin 250mg', 'Amoxicillin 250mg', 'Amoxil', 'Amoxicillin', 'Antibiotic', 'Antibiotic', 'Capsule', '250mg', 'TEST-AMOX-001', 'Test antibiotic', 'H', '3004', '10', 1)
     RETURNING id`
  );
  const med2Id = med2Res.rows[0].id;

  const inv2Res = await testPool.query(
    `INSERT INTO INVENTORY (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, tax_percentage, admin_id)
     VALUES ($1, $2, 'BATCH-T002', 5, CURRENT_DATE + INTERVAL '2 years', 10.00, 45.00, 12.00, 1)
     RETURNING id`,
    [med2Id, supplierId]
  );
  const inv2Id = inv2Res.rows[0].id;

  return {
    supplierId,
    med1Id, inv1Id,
    med2Id, inv2Id,
  };
}

/** Close the test pool and app pool. Call in t.after(). */
async function teardown() {
  await testPool.end().catch(() => {});
  try {
    const { pool: appPool } = require('../../../config/db');
    if (appPool && !appPool.ended) {
      await appPool.end();
    }
  } catch (_) {}
}

/** Direct query on the test pool — for assertions inside tests. */
async function query(sql, params) {
  return testPool.query(sql, params);
}

module.exports = { setupSchema, resetDb, seed, teardown, query, testPool };
