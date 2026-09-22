const { pool } = require('../config/db');

const VALID_SCHEDULES = ['NONE', 'G', 'H', 'H1', 'X'];

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting medicine schedule migration...');
    await client.query('BEGIN');

    // 1. Add schedule column to MEDICINES
    await client.query(`
      ALTER TABLE MEDICINES
      ADD COLUMN IF NOT EXISTS schedule VARCHAR(10) DEFAULT 'NONE';
    `);
    console.log('✓ Added schedule column to MEDICINES');

    // 2. Set all existing rows to NONE
    await client.query(`
      UPDATE MEDICINES SET schedule = 'NONE' WHERE schedule IS NULL;
    `);
    console.log('✓ Existing medicines set to schedule NONE');

    // 3. Add a CHECK constraint (safe — only if not already present)
    const constraintCheck = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'medicines' AND constraint_name = 'medicines_schedule_check';
    `);
    if (constraintCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE MEDICINES
        ADD CONSTRAINT medicines_schedule_check
        CHECK (schedule IN ('NONE', 'G', 'H', 'H1', 'X'));
      `);
      console.log('✓ CHECK constraint added on schedule column');
    } else {
      console.log('✓ CHECK constraint already exists, skipping');
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
