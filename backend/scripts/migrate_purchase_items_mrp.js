/**
 * Migration: purchase_items_mrp
 *
 * Adds `mrp NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (mrp >= 0)` to PURCHASE_ITEMS.
 * Backfills existing purchase_items mrp from selling_price or inventory or price.
 */

const { pool } = require('../config/db');

async function migratePurchaseItemsMrp(targetPool = pool) {
  const client = await targetPool.connect();
  try {
    await client.query('BEGIN');
    console.log('--- Starting Migration: purchase_items_mrp ---');

    await client.query(`
      ALTER TABLE PURCHASE_ITEMS
      ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2) DEFAULT 0;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_purchase_items_mrp'
        ) THEN
          ALTER TABLE PURCHASE_ITEMS
          ADD CONSTRAINT chk_purchase_items_mrp CHECK (mrp >= 0);
        END IF;
      END $$;
    `);

    // Backfill mrp from selling_price, or inventory mrp, or item price
    await client.query(`
      UPDATE PURCHASE_ITEMS pi
      SET mrp = COALESCE(
        NULLIF(pi.selling_price, 0),
        (SELECT inv.mrp FROM INVENTORY inv WHERE inv.medicine_id = pi.medicine_id AND inv.batch_number = pi.batch_number LIMIT 1),
        pi.price,
        0
      )
      WHERE pi.mrp IS NULL OR pi.mrp = 0;

      ALTER TABLE PURCHASE_ITEMS
      ALTER COLUMN mrp SET NOT NULL,
      ALTER COLUMN mrp SET DEFAULT 0;
    `);

    await client.query('COMMIT');
    console.log('✓ PURCHASE_ITEMS mrp column added, backfilled, and constraint verified.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migratePurchaseItemsMrp()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = { migratePurchaseItemsMrp };
