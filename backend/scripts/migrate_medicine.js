const { pool } = require('../config/db');

const migrateMedicineTable = async () => {
    try {
        console.log('Starting medicine table migration...');

        // 1. Add missing columns safely without breaking existing queries
        await pool.query(`
            ALTER TABLE MEDICINES 
                ADD COLUMN IF NOT EXISTS medicine_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS brand_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS salt_composition VARCHAR(200),
                ADD COLUMN IF NOT EXISTS medicine_category VARCHAR(50),
                ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(50),
                ADD COLUMN IF NOT EXISTS strength VARCHAR(50);
        `);
        console.log('Columns ensured on MEDICINES table.');

        // 2. Populate new columns from legacy columns
        await pool.query(`
            UPDATE MEDICINES 
            SET medicine_name = name 
            WHERE medicine_name IS NULL AND name IS NOT NULL;

            UPDATE MEDICINES 
            SET name = medicine_name 
            WHERE name IS NULL AND medicine_name IS NOT NULL;

            UPDATE MEDICINES 
            SET medicine_category = category 
            WHERE medicine_category IS NULL AND category IS NOT NULL;

            UPDATE MEDICINES 
            SET category = medicine_category 
            WHERE category IS NULL AND medicine_category IS NOT NULL;
        `);
        console.log('Synchronized data between name/medicine_name and category/medicine_category.');

        // 3. Create a trigger to keep both sets of column names in sync for backwards compatibility
        await pool.query(`
            CREATE OR REPLACE FUNCTION sync_medicine_columns()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.medicine_name IS NULL AND NEW.name IS NOT NULL THEN
                    NEW.medicine_name := NEW.name;
                ELSIF NEW.name IS NULL AND NEW.medicine_name IS NOT NULL THEN
                    NEW.name := NEW.medicine_name;
                END IF;

                IF NEW.medicine_category IS NULL AND NEW.category IS NOT NULL THEN
                    NEW.medicine_category := NEW.category;
                ELSIF NEW.category IS NULL AND NEW.medicine_category IS NOT NULL THEN
                    NEW.category := NEW.medicine_category;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_sync_medicine_columns ON MEDICINES;

            CREATE TRIGGER trg_sync_medicine_columns
            BEFORE INSERT OR UPDATE ON MEDICINES
            FOR EACH ROW EXECUTE FUNCTION sync_medicine_columns();
        `);
        console.log('Trigger created to keep medicine name & category columns in sync.');

        const checkResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'medicines'
            ORDER BY ordinal_position
        `);
        console.log('Current MEDICINES columns:', checkResult.rows.map(r => r.column_name));
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration error:', error.message, error.stack);
    } finally {
        process.exit();
    }
};

migrateMedicineTable();

