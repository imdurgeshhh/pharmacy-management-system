require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../config/db');

async function consolidateTenantOwnership() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Consolidating data under active Admin ID 7...');
    await client.query('UPDATE medicines SET admin_id = 7 WHERE admin_id = 14');
    await client.query('UPDATE inventory SET admin_id = 7 WHERE admin_id = 14');
    await client.query('UPDATE purchases SET admin_id = 7 WHERE admin_id = 14');
    await client.query('UPDATE sales SET admin_id = 7 WHERE admin_id = 14');
    await client.query('UPDATE customers SET admin_id = 7 WHERE admin_id = 14');
    await client.query('UPDATE suppliers SET admin_id = 7 WHERE admin_id = 14');
    await client.query('UPDATE wholesale_sales SET admin_id = 7 WHERE admin_id = 14');
    await client.query('UPDATE employees SET admin_id = NULL WHERE id = 7');

    await client.query('COMMIT');
    console.log('✅ Tenant consolidation completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Tenant consolidation failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  consolidateTenantOwnership()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { consolidateTenantOwnership };
