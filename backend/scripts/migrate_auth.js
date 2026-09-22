const { pool } = require('../config/db');

async function migrate() {
  console.log('Running auth & employee table migration...');
  try {
    // 1. Add full_name column if missing
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`);
    console.log('✓ Added column full_name (if not exists)');

    // 2. Backfill full_name from name where missing
    await pool.query(`UPDATE employees SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;`);
    console.log('✓ Backfilled full_name from name');

    // 3. Add email column if missing
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
    console.log('✓ Added column email (if not exists)');

    // 4. Add auth_provider column if missing
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';`);
    console.log('✓ Added column auth_provider (if not exists)');

    // 5. Make password column nullable so OAuth/Clerk users do not require a plaintext password
    await pool.query(`ALTER TABLE employees ALTER COLUMN password DROP NOT NULL;`);
    console.log('✓ Altered column password to DROP NOT NULL');

    // 6. Clean up any accounts with magic-string 'clerk_oauth_no_password'
    const cleanupResult = await pool.query(`
      UPDATE employees
      SET auth_provider = 'clerk', password = NULL
      WHERE password = 'clerk_oauth_no_password';
    `);
    console.log(`✓ Cleaned up ${cleanupResult.rowCount} accounts with sentinel 'clerk_oauth_no_password'`);

    // 7. Ensure remaining accounts have auth_provider = 'local'
    await pool.query(`UPDATE employees SET auth_provider = 'local' WHERE auth_provider IS NULL;`);
    console.log('✓ Ensured default auth_provider = local');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
