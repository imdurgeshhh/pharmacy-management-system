const { pool } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        const todaySalesRes = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM SALES WHERE DATE(created_at) = CURRENT_DATE');
        const monthSalesRes = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM SALES WHERE extract(month from created_at) = extract(month from CURRENT_DATE)');
        const inventoryValueRes = await pool.query('SELECT COALESCE(SUM(stock_qty * purchase_price), 0) as total FROM INVENTORY');
        const lowStockCountRes = await pool.query('SELECT COUNT(*) FROM INVENTORY WHERE stock_qty < 20');

        res.json({
            todaySales: parseFloat(todaySalesRes.rows[0].total),
            monthSales: parseFloat(monthSalesRes.rows[0].total),
            inventoryValue: parseFloat(inventoryValueRes.rows[0].total),
            lowStockItems: parseInt(lowStockCountRes.rows[0].count)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

exports.getSalesReport = async (req, res) => {
    // Generate data for sales chart (last 7 days)
    try {
        const query = `
            SELECT DATE(created_at) as date, SUM(total_amount) as sales, SUM(tax_amount) as tax
            FROM SALES
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sales report' });
    }
};
