const { pool } = require('../config/db');

async function clean() {
  await pool.query("DELETE FROM inventory WHERE batch_number = 'B3'");
  await pool.query("DELETE FROM purchase_items WHERE batch_number = 'B3'");
  await pool.query("DELETE FROM medicines WHERE name LIKE 'NewMed%'");
  console.log('Cleaned test items');
  await pool.end();
}

clean();
