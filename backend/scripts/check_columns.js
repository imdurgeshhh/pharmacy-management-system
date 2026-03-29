const { pool } = require('../config/db');

async function check() {
  const r = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees' ORDER BY ordinal_position`
  );
  console.log('employees table columns:');
  r.rows.forEach(c => console.log(' -', c.column_name, ':', c.data_type));
  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
