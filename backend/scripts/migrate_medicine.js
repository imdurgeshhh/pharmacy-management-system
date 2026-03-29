const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'pharma_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false }
});

const migrateMedicineTable = async () => {
    try {
        // Check if new columns exist
        const checkResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'medicines'
        `);
        
        const existingColumns = checkResult.rows.map(r => r.column_name);
        console.log('Existing columns:', existingColumns);
        
        // Add new columns if they don't exist
        if (!existingColumns.includes('brand_name')) {
            await pool.query('ALTER TABLE MEDICINES ADD COLUMN brand_name VARCHAR(100)');
            console.log('Added brand_name column');
        }
        
        if (!existingColumns.includes('salt_composition')) {
            await pool.query('ALTER TABLE MEDICINES ADD COLUMN salt_composition VARCHAR(200)');
            console.log('Added salt_composition column');
        }
        
        if (!existingColumns.includes('dosage_form')) {
            await pool.query('ALTER TABLE MEDICINES ADD COLUMN dosage_form VARCHAR(50)');
            console.log('Added dosage_form column');
        }
        
        if (!existingColumns.includes('strength')) {
            await pool.query('ALTER TABLE MEDICINES ADD COLUMN strength VARCHAR(50)');
            console.log('Added strength column');
        }
        
        // Rename name to medicine_name if needed
        if (existingColumns.includes('name') && !existingColumns.includes('medicine_name')) {
            await pool.query('ALTER TABLE MEDICINES RENAME COLUMN name TO medicine_name');
            console.log('Renamed name to medicine_name');
        }
        
        if (existingColumns.includes('category') && !existingColumns.includes('medicine_category')) {
            await pool.query('ALTER TABLE MEDICINES RENAME COLUMN category TO medicine_category');
            console.log('Renamed category to medicine_category');
        }
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration error:', error.message);
    } finally {
        process.exit();
    }
};

migrateMedicineTable();

