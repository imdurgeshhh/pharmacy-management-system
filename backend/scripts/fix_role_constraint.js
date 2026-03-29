const { pool } = require('../config/db');

async function fix() {
  try {
    // 1. Check what values the constraint allows
    const c = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      WHERE conrelid = 'employees'::regclass
    `);
    console.log('Constraints on employees table:');
    c.rows.forEach(r => console.log(' -', r.conname, ':', r.def));

    // 2. Drop old role check constraint (blocks 'employee' value)
    await pool.query(`
      ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
    `);
    console.log('\n✅ Dropped employees_role_check constraint');

    // 3. Add new constraint that allows admin, shopkeeper, employee
    await pool.query(`
      ALTER TABLE employees
        ADD CONSTRAINT employees_role_check
        CHECK (role IN ('admin', 'shopkeeper', 'employee'));
    `);
    console.log('✅ Added updated role check: admin | shopkeeper | employee');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fix();
