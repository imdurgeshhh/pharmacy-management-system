/**
 * Migration: units_per_strip_v2
 *
 * Description:
 * - Enforces units_per_strip NOT NULL DEFAULT 1 with CHECK (units_per_strip >= 1) on MEDICINES.
 * - Enforces CHECK (stock_qty >= 0) on INVENTORY.
 * - Adds units_per_strip, strips_qty, and loose_qty to PURCHASE_ITEMS with constraints.
 * - Adds loose_qty to SALE_ITEMS and ensures CHECK constraints on units_per_strip.
 * - Audits medicines that may need manual pack size updates.
 *
 * Rollback Instructions:
 * In case of rollback:
 * ALTER TABLE PURCHASE_ITEMS DROP COLUMN IF EXISTS units_per_strip, DROP COLUMN IF EXISTS strips_qty, DROP COLUMN IF EXISTS loose_qty;
 * ALTER TABLE SALE_ITEMS DROP COLUMN IF EXISTS loose_qty;
 * ALTER TABLE MEDICINES DROP CONSTRAINT IF EXISTS chk_medicines_units_per_strip;
 * ALTER TABLE INVENTORY DROP CONSTRAINT IF EXISTS chk_inventory_stock_qty;
 */

const { pool } = require('../config/db');

async function migrateUnitsPerStripV2(targetPool = pool) {
    const client = await targetPool.connect();
    try {
        await client.query('BEGIN');
        console.log('--- Starting Migration: units_per_strip_v2 ---');

        // 1. MEDICINES: ensure column, default, nullability and check constraint
        await client.query(`
            ALTER TABLE MEDICINES
            ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 1;

            UPDATE MEDICINES
            SET units_per_strip = 1
            WHERE units_per_strip IS NULL OR units_per_strip < 1;

            ALTER TABLE MEDICINES
            ALTER COLUMN units_per_strip SET NOT NULL,
            ALTER COLUMN units_per_strip SET DEFAULT 1;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'chk_medicines_units_per_strip'
                ) THEN
                    ALTER TABLE MEDICINES
                    ADD CONSTRAINT chk_medicines_units_per_strip CHECK (units_per_strip >= 1);
                END IF;
            END $$;
        `);
        console.log('✓ MEDICINES table: units_per_strip column and constraint verified.');

        // 2. INVENTORY: check constraint for non-negative stock
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_stock_qty'
                ) THEN
                    ALTER TABLE INVENTORY
                    ADD CONSTRAINT chk_inventory_stock_qty CHECK (stock_qty >= 0);
                END IF;
            END $$;
        `);
        console.log('✓ INVENTORY table: non-negative stock_qty constraint verified.');

        // 3. PURCHASE_ITEMS: units_per_strip, strips_qty, loose_qty
        await client.query(`
            ALTER TABLE PURCHASE_ITEMS
            ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS strips_qty NUMERIC(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS loose_qty INTEGER DEFAULT 0;

            UPDATE PURCHASE_ITEMS
            SET units_per_strip = 1
            WHERE units_per_strip IS NULL OR units_per_strip < 1;

            UPDATE PURCHASE_ITEMS
            SET loose_qty = qty
            WHERE (loose_qty IS NULL OR loose_qty = 0) AND (strips_qty IS NULL OR strips_qty = 0);

            ALTER TABLE PURCHASE_ITEMS
            ALTER COLUMN units_per_strip SET NOT NULL,
            ALTER COLUMN units_per_strip SET DEFAULT 1;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'chk_purchase_items_units_per_strip'
                ) THEN
                    ALTER TABLE PURCHASE_ITEMS
                    ADD CONSTRAINT chk_purchase_items_units_per_strip CHECK (units_per_strip >= 1);
                END IF;
            END $$;
        `);
        console.log('✓ PURCHASE_ITEMS table: units_per_strip, strips_qty, loose_qty verified.');

        // 4. SALE_ITEMS: loose_qty and check constraints
        await client.query(`
            ALTER TABLE SALE_ITEMS
            ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS strips_qty NUMERIC(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS loose_qty INTEGER DEFAULT 0;

            UPDATE SALE_ITEMS
            SET units_per_strip = 1
            WHERE units_per_strip IS NULL OR units_per_strip < 1;

            UPDATE SALE_ITEMS
            SET loose_qty = GREATEST(0, qty - (COALESCE(strips_qty, 0) * COALESCE(units_per_strip, 1)))
            WHERE loose_qty IS NULL;

            ALTER TABLE SALE_ITEMS
            ALTER COLUMN units_per_strip SET NOT NULL,
            ALTER COLUMN units_per_strip SET DEFAULT 1;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sale_items_units_per_strip'
                ) THEN
                    ALTER TABLE SALE_ITEMS
                    ADD CONSTRAINT chk_sale_items_units_per_strip CHECK (units_per_strip >= 1);
                END IF;
            END $$;
        `);
        console.log('✓ SALE_ITEMS table: units_per_strip, strips_qty, loose_qty verified.');

        // 5. Audit Report: list medicines that may need manual pack size setting
        const auditRes = await client.query(`
            SELECT m.id, COALESCE(m.medicine_name, m.name) AS name, m.dosage_form, m.pack_size,
                   m.units_per_strip, COALESCE(SUM(i.stock_qty), 0) AS current_stock
            FROM MEDICINES m
            LEFT JOIN INVENTORY i ON m.id = i.medicine_id
            WHERE m.units_per_strip = 1
              AND (
                LOWER(COALESCE(m.dosage_form, '')) IN ('tablet', 'capsule', 'strip')
                OR LOWER(COALESCE(m.medicine_name, m.name, '')) LIKE '%tablet%'
                OR LOWER(COALESCE(m.medicine_name, m.name, '')) LIKE '%capsule%'
                OR LOWER(COALESCE(m.medicine_name, m.name, '')) LIKE '%tab%'
                OR LOWER(COALESCE(m.medicine_name, m.name, '')) LIKE '%cap%'
              )
            GROUP BY m.id, m.medicine_name, m.name, m.dosage_form, m.pack_size, m.units_per_strip
            ORDER BY m.id;
        `);

        await client.query('COMMIT');
        console.log('✅ Migration units_per_strip_v2 completed successfully!\n');

        if (auditRes.rows.length > 0) {
            console.log('⚠️ [AUDIT REPORT] The following medicines are marked with units_per_strip = 1 but appear to be tablets/capsules:');
            console.table(auditRes.rows);
            console.log('Please update their pack size via the Inventory or Purchases page if they are sold in multi-tablet strips.');
        } else {
            console.log('ℹ️ No unconfigured tablet/capsule medicines found.');
        }

        return auditRes.rows;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    migrateUnitsPerStripV2()
        .then(() => pool.end())
        .catch(err => {
            console.error(err);
            pool.end();
            process.exit(1);
        });
}

module.exports = migrateUnitsPerStripV2;
