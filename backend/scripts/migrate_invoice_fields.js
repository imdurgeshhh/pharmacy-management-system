const { pool } = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting DB migration for invoice fields...');
    await client.query('BEGIN');

    // 1. Medicines table
    await client.query(`
      ALTER TABLE MEDICINES
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT '3004',
      ADD COLUMN IF NOT EXISTS pack_size VARCHAR(50) DEFAULT '1';
    `);
    console.log('✓ MEDICINES table updated');

    // 2. Inventory table
    await client.query(`
      ALTER TABLE INVENTORY
      ADD COLUMN IF NOT EXISTS old_mrp NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS trade_rate NUMERIC(10,2);
    `);
    console.log('✓ INVENTORY table updated');

    // 3. Customers table
    await client.query(`
      ALTER TABLE CUSTOMERS
      ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) DEFAULT 0.00;
    `);
    console.log('✓ CUSTOMERS table updated');

    // 4. Sales table
    await client.query(`
      ALTER TABLE SALES
      ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'Cash',
      ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS sub_total NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS scheme_amount NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS cr_dr_amount NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS round_off NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS rx_number VARCHAR(100);
    `);
    console.log('✓ SALES table updated');

    // 5. Sale_Items table
    await client.query(`
      ALTER TABLE SALE_ITEMS
      ADD COLUMN IF NOT EXISTS free_qty INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS trade_rate NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS scheme_pct NUMERIC(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS net_rate NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS net_total NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS old_mrp NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS pack VARCHAR(50);
    `);
    console.log('✓ SALE_ITEMS table updated');

    // 6. Store Settings table (for configurable business details)
    await client.query(`
      CREATE TABLE IF NOT EXISTS STORE_SETTINGS (
        id SERIAL PRIMARY KEY,
        shop_name VARCHAR(150) NOT NULL DEFAULT 'KUNAL MEDICAL AGENCY LAKHANPURI',
        address TEXT NOT NULL DEFAULT 'LAKHANPURI KANKER',
        dl_no VARCHAR(100) DEFAULT 'RLFT20CT2025002791-RLF21CT2025002773',
        pan_no VARCHAR(50) DEFAULT '',
        aadhar_no VARCHAR(50) DEFAULT '',
        food_lic_no VARCHAR(50) DEFAULT '',
        phone VARCHAR(30) DEFAULT '',
        email VARCHAR(100) DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed default settings if empty
    const settingsCheck = await client.query('SELECT COUNT(*) FROM STORE_SETTINGS');
    if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO STORE_SETTINGS (shop_name, address, dl_no, pan_no, aadhar_no, food_lic_no)
        VALUES (
          'KUNAL MEDICAL AGENCY LAKHANPURI',
          'LAKHANPURI KANKER',
          'RLFT20CT2025002791-RLF21CT2025002773',
          '',
          '',
          ''
        );
      `);
      console.log('✓ STORE_SETTINGS initialized with default Kunal Medical Agency details');
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
