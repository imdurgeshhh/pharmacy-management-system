const { pool } = require('../config/db');

async function migrateUnitsPerStrip() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Running migration: units_per_strip on medicines and sale_items...');

    // 1. Add units_per_strip to MEDICINES table
    await client.query(`
      ALTER TABLE MEDICINES
      ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 1;
    `);
    console.log('✓ Added units_per_strip to MEDICINES table');

    // 2. Add units_per_strip and strips_qty to SALE_ITEMS table
    await client.query(`
      ALTER TABLE SALE_ITEMS
      ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS strips_qty NUMERIC(10,2) DEFAULT 0;
    `);
    console.log('✓ Added units_per_strip and strips_qty to SALE_ITEMS table');

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrateUnitsPerStrip()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateUnitsPerStrip;
