const { pool } = require('../config/db');

// ─── Table Bootstrap ────────────────────────────────────────────────────────

const ensureTables = async () => {
    // Create WHOLESALE_SALES if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS WHOLESALE_SALES (
            id SERIAL PRIMARY KEY,
            medicine_name VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL,
            price_per_unit NUMERIC(12,2) NOT NULL,
            total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
            gst_number VARCHAR(20),
            shopkeeper_name VARCHAR(255) NOT NULL,
            sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // Create WHOLESALE_PURCHASES if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS WHOLESALE_PURCHASES (
            id SERIAL PRIMARY KEY,
            medicine_name VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL,
            price_per_unit NUMERIC(12,2) NOT NULL,
            total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
            gst_number VARCHAR(20),
            supplier_name VARCHAR(255) NOT NULL,
            purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // Add gst_number column to existing tables if they exist without it
    await pool.query(`
        ALTER TABLE WHOLESALE_SALES ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20)
    `).catch(() => {});
    await pool.query(`
        ALTER TABLE WHOLESALE_PURCHASES ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20)
    `).catch(() => {});
};

ensureTables().catch(err => console.error('Wholesale table init error:', err));

// ─── Wholesale Sales ─────────────────────────────────────────────────────────

exports.getWholesaleSales = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM WHOLESALE_SALES ORDER BY sale_date DESC, created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch wholesale sales' });
    }
};

exports.addWholesaleSale = async (req, res) => {
    const { medicine_name, quantity, price_per_unit, gst_number, shopkeeper_name, sale_date } = req.body;
    if (!medicine_name || !quantity || !price_per_unit || !shopkeeper_name) {
        return res.status(400).json({ error: 'medicine_name, quantity, price_per_unit, and shopkeeper_name are required' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO WHOLESALE_SALES (medicine_name, quantity, price_per_unit, gst_number, shopkeeper_name, sale_date)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                medicine_name,
                Number(quantity),
                Number(price_per_unit),
                gst_number || null,
                shopkeeper_name,
                sale_date || new Date().toISOString().slice(0, 10)
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add wholesale sale' });
    }
};

exports.deleteWholesaleSale = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM WHOLESALE_SALES WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete wholesale sale' });
    }
};

// ─── Wholesale Purchases ─────────────────────────────────────────────────────

exports.getWholesalePurchases = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM WHOLESALE_PURCHASES ORDER BY purchase_date DESC, created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch wholesale purchases' });
    }
};

exports.addWholesalePurchase = async (req, res) => {
    const { medicine_name, quantity, price_per_unit, gst_number, supplier_name, purchase_date } = req.body;
    if (!medicine_name || !quantity || !price_per_unit || !supplier_name) {
        return res.status(400).json({ error: 'medicine_name, quantity, price_per_unit, and supplier_name are required' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO WHOLESALE_PURCHASES (medicine_name, quantity, price_per_unit, gst_number, supplier_name, purchase_date)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                medicine_name,
                Number(quantity),
                Number(price_per_unit),
                gst_number || null,
                supplier_name,
                purchase_date || new Date().toISOString().slice(0, 10)
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add wholesale purchase' });
    }
};

exports.deleteWholesalePurchase = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM WHOLESALE_PURCHASES WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete wholesale purchase' });
    }
};
