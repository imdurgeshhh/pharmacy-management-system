const { pool } = require('../config/db');

async function migrateStoreSettings() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Migrating STORE_SETTINGS table columns...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS STORE_SETTINGS (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        shop_name VARCHAR(150),
        address TEXT,
        dl_no VARCHAR(100),
        pan_no VARCHAR(50),
        aadhar_no VARCHAR(50),
        food_lic_no VARCHAR(50),
        phone VARCHAR(30),
        email VARCHAR(100),
        gstin VARCHAR(20),
        pharmacist_name VARCHAR(150),
        pharmacist_reg_no VARCHAR(100),
        updated_by INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE STORE_SETTINGS
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(20),
      ADD COLUMN IF NOT EXISTS pharmacist_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS pharmacist_reg_no VARCHAR(100),
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // Add unique constraint on admin_id so upsert (ON CONFLICT (admin_id)) is clean and robust
    // First check if a unique constraint or unique index on admin_id already exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'store_settings_admin_id_key'
        ) THEN
          -- In case there are duplicate rows for the same admin_id, keep only the latest row per admin_id
          DELETE FROM STORE_SETTINGS a
          USING STORE_SETTINGS b
          WHERE a.admin_id = b.admin_id AND a.id < b.id AND a.admin_id IS NOT NULL;

          ALTER TABLE STORE_SETTINGS ADD CONSTRAINT store_settings_admin_id_key UNIQUE (admin_id);
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✓ STORE_SETTINGS migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateStoreSettings();
}

module.exports = migrateStoreSettings;
