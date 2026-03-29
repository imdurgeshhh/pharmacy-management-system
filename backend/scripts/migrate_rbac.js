const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: 'postgres',
    host: 'db.chiphyjrckarzvdrgriw.supabase.co',
    database: 'postgres',
    password: '@Durgesh9755',
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

async function migrateRBAC() {
    try {
        await client.connect();
        console.log('Connected to Supabase DB');

        // Add columns if not exist
        await client.query(`
            ALTER TABLE EMPLOYEES 
            ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS email VARCHAR(100)
        `);
        console.log('Added full_name and email columns');

        // Drop old constraint if exists
        await client.query(`ALTER TABLE EMPLOYEES DROP CONSTRAINT IF EXISTS employees_role_check`);
        console.log('Dropped old role constraint');

        // Add new role constraint
        await client.query(`
            ALTER TABLE EMPLOYEES 
            ADD CONSTRAINT employees_role_check 
            CHECK (role IN ('Admin', 'Shopkeeper'))
        `);
        console.log('Added new role CHECK constraint');

        // Update existing admin to new roles (if any cashier -> Shopkeeper?)
        await client.query(`UPDATE EMPLOYEES SET role = 'Admin' WHERE role = 'admin'`);
        await client.query(`UPDATE EMPLOYEES SET role = 'Shopkeeper' WHERE role = 'cashier'`);

        // Seed test Shopkeeper if not exists
        await client.query(`
            INSERT INTO EMPLOYEES (full_name, username, password, role, email)
            VALUES ('Shop Keeper', 'shopkeeper', 'shop123', 'Shopkeeper', 'shop@pharma.com')
            ON CONFLICT (username) DO NOTHING
        `);
        console.log('Migration complete. Test Shopkeeper: shopkeeper/shop123');

        await client.end();
    } catch (error) {
        console.error('Migration error:', error);
    }
}

migrateRBAC();

