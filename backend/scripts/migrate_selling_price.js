/**
 * Migration: selling_price
 *
 * Description:
 * - Adds `selling_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0)` to INVENTORY.
 * - Adds `selling_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0)` to PURCHASE_ITEMS.
 * - Backfills `selling_price` on existing INVENTORY records:
 *   If mrp > 0 and mrp != purchase_price, use mrp.
 *   If mrp == purchase_price or mrp == 0, apply default 1.25x markup on purchase_price.
 * - Synchronizes mrp with selling_price for backwards compatibility.
 * - Reports all rows backfilled so any can be reviewed/corrected if needed.
 */

const { pool } = require('../config/db');

async function migrateSellingPrice(targetPool = pool) {
  const client = await targetPool.connect();
  try {
    await client.query('BEGIN');
    console.log('--- Starting Migration: selling_price ---');

    // 1. INVENTORY: add selling_price column
    await client.query(`
      ALTER TABLE INVENTORY
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2) DEFAULT 0;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_selling_price'
        ) THEN
          ALTER TABLE INVENTORY
          ADD CONSTRAINT chk_inventory_selling_price CHECK (selling_price >= 0);
        END IF;
      END $$;
    `);
    console.log('✓ INVENTORY table: selling_price column and constraint created/verified.');

    // 2. Identify rows needing backfill
    const rowsToBackfill = await client.query(`
      SELECT id, medicine_id, batch_number, purchase_price, mrp, selling_price
      FROM INVENTORY
      WHERE selling_price IS NULL OR selling_price = 0;
    `);

    let backfilledCount = 0;
    const backfilledDetails = [];

    for (const r of rowsToBackfill.rows) {
      const pPrice = parseFloat(r.purchase_price) || 0;
      const curMrp = parseFloat(r.mrp) || 0;
      let calculatedSellingPrice = 0;

      if (curMrp > 0 && curMrp !== pPrice) {
        calculatedSellingPrice = curMrp;
      } else if (pPrice > 0) {
        calculatedSellingPrice = Math.round(pPrice * 1.25 * 100) / 100;
      }

      await client.query(
        `UPDATE INVENTORY 
         SET selling_price = $1, mrp = CASE WHEN mrp IS NULL OR mrp = 0 THEN $1 ELSE mrp END
         WHERE id = $2`,
        [calculatedSellingPrice, r.id]
      );

      backfilledCount++;
      backfilledDetails.push({
        inventory_id: r.id,
        medicine_id: r.medicine_id,
        batch: r.batch_number,
        purchase_price: pPrice,
        previous_mrp: curMrp,
        backfilled_selling_price: calculatedSellingPrice
      });
    }

    console.log(`✓ INVENTORY: Backfilled selling_price for ${backfilledCount} row(s).`);
    if (backfilledDetails.length > 0) {
      console.log('--- Backfilled Row Details (for manual correction if needed) ---');
      console.table(backfilledDetails);
    }

    // Set NOT NULL on INVENTORY.selling_price
    await client.query(`
      ALTER TABLE INVENTORY
      ALTER COLUMN selling_price SET NOT NULL,
      ALTER COLUMN selling_price SET DEFAULT 0;
    `);

    // 3. PURCHASE_ITEMS: add selling_price column
    await client.query(`
      ALTER TABLE PURCHASE_ITEMS
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2) DEFAULT 0;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_purchase_items_selling_price'
        ) THEN
          ALTER TABLE PURCHASE_ITEMS
          ADD CONSTRAINT chk_purchase_items_selling_price CHECK (selling_price >= 0);
        END IF;
      END $$;
    `);

    // Backfill PURCHASE_ITEMS selling_price from INVENTORY where possible
    await client.query(`
      UPDATE PURCHASE_ITEMS pi
      SET selling_price = COALESCE(
        (SELECT inv.selling_price FROM INVENTORY inv WHERE inv.medicine_id = pi.medicine_id AND inv.batch_number = pi.batch_number LIMIT 1),
        ROUND(pi.price * 1.25, 2),
        0
      )
      WHERE pi.selling_price IS NULL OR pi.selling_price = 0;

      ALTER TABLE PURCHASE_ITEMS
      ALTER COLUMN selling_price SET NOT NULL,
      ALTER COLUMN selling_price SET DEFAULT 0;
    `);
    console.log('✓ PURCHASE_ITEMS table: selling_price column, constraints, and backfill verified.');

    await client.query('COMMIT');
    console.log('--- Migration: selling_price completed successfully ---');
    return { backfilledCount, backfilledDetails };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateSellingPrice()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateSellingPrice };
