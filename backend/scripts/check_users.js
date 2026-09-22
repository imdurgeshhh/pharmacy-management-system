require('dotenv').config();
const db = require('../config/db');

async function run() {
  const target = process.argv[2] || 'test@example.com';
  try {
    const res = await db.query(
      'SELECT id, username, email, role FROM employees WHERE username = $1 OR email = $1',
      [target]
    );
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error fetching users:', err);
    process.exit(1);
  }
}

run();
