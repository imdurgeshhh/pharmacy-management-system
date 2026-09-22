require('dotenv').config();
const db = require('../config/db');

async function migrateRBAC() {
    try {
        console.log('Connecting via configured database pool...');

        // Add columns if not exist
        await db.query(`
            ALTER TABLE EMPLOYEES 
            ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS email VARCHAR(100)
        `);
        console.log('Added full_name and email columns');

        // Drop old constraint if exists
        await db.query(`ALTER TABLE EMPLOYEES DROP CONSTRAINT IF EXISTS employees_role_check`);
        console.log('Dropped old role constraint');

        // Add new role constraint
        await db.query(`
            ALTER TABLE EMPLOYEES 
            ADD CONSTRAINT employees_role_check 
            CHECK (role IN ('Admin', 'Shopkeeper'))
        `);
        console.log('Added new role CHECK constraint');

        // Update existing admin to new roles (if any cashier -> Shopkeeper?)
        await db.query(`UPDATE EMPLOYEES SET role = 'Admin' WHERE role = 'admin'`);
        await db.query(`UPDATE EMPLOYEES SET role = 'Shopkeeper' WHERE role = 'cashier'`);

        // Seed test Shopkeeper if not exists
        await db.query(`
            INSERT INTO EMPLOYEES (full_name, username, password, role, email)
            VALUES ('Shop Keeper', 'shopkeeper', 'shop123', 'Shopkeeper', 'shop@pharma.com')
            ON CONFLICT (username) DO NOTHING
        `);
        console.log('Migration complete. Test Shopkeeper: shopkeeper/shop123');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateRBAC();

