const { pool } = require('./config/db');
(async () => {
  try {
    const tables = ['sales', 'sale_items', 'customers', 'inventory'];
    for (const t of tables) {
      const r = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t]
      );
      console.log(t.toUpperCase() + ': ' + r.rows.map(c => c.column_name).join(', '));
    }
    // Also check a sample inventory row to see real data
    const inv = await pool.query("SELECT id, medicine_id, batch_number, stock_qty, mrp FROM inventory LIMIT 3");
    console.log('INVENTORY SAMPLE:', JSON.stringify(inv.rows));
  } catch(e) { console.error(e.message); }
  process.exit(0);
})();
