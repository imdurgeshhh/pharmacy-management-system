const { pool } = require('../config/db');

/**
 * Migration: Multi-Tenant Ownership & Data Isolation
 * 
 * Adds `admin_id` (INTEGER REFERENCES employees(id) ON DELETE CASCADE)
 * to all business tables, adds indexes, and safely backfills existing
 * unowned rows to the primary admin.
 */
async function migrateMultiTenantOwnership() {
  console.log('--- Starting Multi-Tenant Ownership Migration ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Identify primary Admin for backfill
    const adminRes = await client.query(
      `SELECT id FROM employees WHERE role = 'admin' ORDER BY id ASC LIMIT 1`
    );
    const primaryAdminId = adminRes.rows[0]?.id || null;
    console.log(`Primary Admin for backfill: ${primaryAdminId}`);

    // 2. Business tables to isolate by admin_id
    const tables = [
      'medicines',
      'inventory',
      'purchases',
      'sales',
      'customers',
      'suppliers',
      'wholesale_sales',
      'wholesale_purchases',
      'store_settings',
      'alerts'
    ];

    for (const table of tables) {
      console.log(`Securing table: ${table}...`);
      
      // Add admin_id column if not exists
      await client.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES employees(id) ON DELETE CASCADE;
      `);

      // Add index for fast tenant query filtering
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table}_admin_id ON ${table}(admin_id);
      `);

      // Safe backfill of existing rows if primary Admin exists
      if (primaryAdminId) {
        const backfillRes = await client.query(`
          UPDATE ${table} 
          SET admin_id = $1 
          WHERE admin_id IS NULL;
        `, [primaryAdminId]);
        console.log(`  -> Backfilled ${backfillRes.rowCount} rows in ${table}`);
      }
    }

    // 3. Ensure employees table has correct constraints
    await client.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

      CREATE INDEX IF NOT EXISTS idx_employees_admin_id ON employees(admin_id);
      CREATE INDEX IF NOT EXISTS idx_employees_clerk_id ON employees(clerk_user_id);
    `);

    // Ensure test shopkeepers have admin_id linked if missing
    if (primaryAdminId) {
      await client.query(`
        UPDATE employees
        SET admin_id = $1
        WHERE (role = 'shopkeeper' OR role = 'employee') AND admin_id IS NULL AND id != $1;
      `, [primaryAdminId]);
    }

    await client.query('COMMIT');
    console.log('✅ Multi-Tenant Ownership Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateMultiTenantOwnership();
}

module.exports = { migrateMultiTenantOwnership };
