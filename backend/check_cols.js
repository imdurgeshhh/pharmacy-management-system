const { pool } = require('./config/db');
(async () => {
  try {
    const tables = ['sales', 'sale_items', 'customers', 'inventory', 'medicines', 'suppliers', 'purchases', 'purchase_items', 'wholesale_sales', 'wholesale_purchases', 'store_settings', 'alerts'];
    for (const t of tables) {
      const r = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t]
      );
      console.log(t.toUpperCase() + ': ' + r.rows.map(c => c.column_name).join(', '));
    }
  } catch(e) { console.error(e.message); }
  process.exit(0);
})();
