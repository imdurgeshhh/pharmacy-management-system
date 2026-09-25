const { pool } = require('../config/db');

// ─── Table Bootstrap ────────────────────────────────────────────────────────

const ensureTables = async () => {
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
            created_at TIMESTAMP DEFAULT NOW(),
            admin_id INTEGER
        )
    `);

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
            created_at TIMESTAMP DEFAULT NOW(),
            admin_id INTEGER
        )
    `);

    await pool.query(`ALTER TABLE WHOLESALE_SALES ADD COLUMN IF NOT EXISTS admin_id INTEGER`).catch(() => {});
    await pool.query(`ALTER TABLE WHOLESALE_PURCHASES ADD COLUMN IF NOT EXISTS admin_id INTEGER`).catch(() => {});
};

ensureTables().catch(err => console.error('Wholesale table init error:', err));

// ─── Wholesale Sales ─────────────────────────────────────────────────────────

exports.getWholesaleSales = async (req, res) => {
    try {
        const adminId = req.adminId;
        const result = await pool.query(
            'SELECT * FROM WHOLESALE_SALES WHERE admin_id = $1 ORDER BY sale_date DESC, created_at DESC',
            [adminId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch wholesale sales' });
    }
};

exports.addWholesaleSale = async (req, res) => {
    const adminId = req.adminId;
    const { medicine_name, quantity, price_per_unit, gst_number, shopkeeper_name, sale_date } = req.body;
    if (!medicine_name || !quantity || !price_per_unit || !shopkeeper_name) {
        return res.status(400).json({ error: 'medicine_name, quantity, price_per_unit, and shopkeeper_name are required' });
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
        return res.status(400).json({ error: 'quantity must be a positive number' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find the inventory batch for this medicine (by name, earliest expiry, sufficient stock first)
        const invCheck = await client.query(
            `SELECT i.id, i.stock_qty, COALESCE(m.medicine_name, m.name) AS display_name
             FROM INVENTORY i
             JOIN MEDICINES m ON i.medicine_id = m.id
             WHERE (LOWER(COALESCE(m.medicine_name, m.name)) = LOWER($1))
               AND i.admin_id = $2
             ORDER BY (i.stock_qty >= $3) DESC, i.expiry_date ASC, i.id ASC
             LIMIT 1`,
            [medicine_name.trim(), adminId, qty]
        );

        if (invCheck.rows.length > 0) {
            const invRecord = invCheck.rows[0];
            if (invRecord.stock_qty < qty) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Insufficient stock for "${invRecord.display_name}". Available: ${invRecord.stock_qty}, Requested: ${qty}.`
                });
            }

            // Deduct stock atomically
            const deductRes = await client.query(
                'UPDATE INVENTORY SET stock_qty = stock_qty - $1 WHERE id = $2 AND admin_id = $3 AND stock_qty >= $1 RETURNING stock_qty',
                [qty, invRecord.id, adminId]
            );
            if (deductRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Insufficient stock for "${invRecord.display_name}". Available: ${invRecord.stock_qty}, Requested: ${qty}.`
                });
            }
        }

        // Insert wholesale sale record
        const result = await client.query(
            `INSERT INTO WHOLESALE_SALES (medicine_name, quantity, price_per_unit, gst_number, shopkeeper_name, sale_date, admin_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                medicine_name,
                qty,
                Number(price_per_unit),
                gst_number || null,
                shopkeeper_name,
                sale_date || new Date().toISOString().slice(0, 10),
                adminId
            ]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to add wholesale sale' });
    } finally {
        client.release();
    }
};

exports.deleteWholesaleSale = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch the sale record first so we can revert the stock
        const saleCheck = await client.query(
            'SELECT * FROM WHOLESALE_SALES WHERE id = $1 AND admin_id = $2',
            [id, adminId]
        );
        if (saleCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Record not found' });
        }

        const sale = saleCheck.rows[0];

        // Delete the sale record
        await client.query(
            'DELETE FROM WHOLESALE_SALES WHERE id = $1 AND admin_id = $2',
            [id, adminId]
        );

        // Restore stock to inventory (match by medicine name, pick earliest expiry batch)
        // If the medicine no longer exists in inventory, we skip revert — sale is still deleted.
        const invCheck = await client.query(
            `SELECT i.id
             FROM INVENTORY i
             JOIN MEDICINES m ON i.medicine_id = m.id
             WHERE (LOWER(COALESCE(m.medicine_name, m.name)) = LOWER($1))
               AND i.admin_id = $2
             ORDER BY i.expiry_date ASC, i.id ASC
             LIMIT 1`,
            [sale.medicine_name, adminId]
        );

        if (invCheck.rows.length > 0) {
            await client.query(
                'UPDATE INVENTORY SET stock_qty = stock_qty + $1 WHERE id = $2 AND admin_id = $3',
                [sale.quantity, invCheck.rows[0].id, adminId]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to delete wholesale sale' });
    } finally {
        client.release();
    }
};

// ─── Wholesale Purchases ─────────────────────────────────────────────────────

exports.getWholesalePurchases = async (req, res) => {
    try {
        const adminId = req.adminId;
        const query = `
            SELECT 
                id,
                medicine_name,
                quantity,
                price_per_unit,
                total_amount,
                gst_number,
                supplier_name,
                purchase_date,
                created_at,
                admin_id
            FROM (
                SELECT 
                    id,
                    medicine_name,
                    quantity,
                    price_per_unit,
                    total_amount,
                    gst_number,
                    supplier_name,
                    purchase_date,
                    created_at,
                    admin_id
                FROM WHOLESALE_PURCHASES
                WHERE admin_id = $1

                UNION ALL

                SELECT 
                    pi.id,
                    COALESCE(m.medicine_name, m.name, '—') AS medicine_name,
                    pi.qty AS quantity,
                    pi.price AS price_per_unit,
                    ROUND((pi.qty * pi.price)::numeric, 2) AS total_amount,
                    NULL::varchar AS gst_number,
                    COALESCE(s.name, '—') AS supplier_name,
                    p.created_at::date AS purchase_date,
                    p.created_at,
                    p.admin_id
                FROM purchase_items pi
                JOIN purchases p ON pi.purchase_id = p.id
                LEFT JOIN medicines m ON pi.medicine_id = m.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.admin_id = $1
            ) combined
            ORDER BY purchase_date DESC, created_at DESC
        `;
        const result = await pool.query(query, [adminId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch wholesale purchases' });
    }
};

exports.addWholesalePurchase = async (req, res) => {
    const adminId = req.adminId;
    const { medicine_name, quantity, price_per_unit, gst_number, supplier_name, purchase_date } = req.body;
    if (!medicine_name || !quantity || !price_per_unit || !supplier_name) {
        return res.status(400).json({ error: 'medicine_name, quantity, price_per_unit, and supplier_name are required' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO WHOLESALE_PURCHASES (medicine_name, quantity, price_per_unit, gst_number, supplier_name, purchase_date, admin_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                medicine_name,
                Number(quantity),
                Number(price_per_unit),
                gst_number || null,
                supplier_name,
                purchase_date || new Date().toISOString().slice(0, 10),
                adminId
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
    const adminId = req.adminId;
    try {
        const result = await pool.query(
            'DELETE FROM WHOLESALE_PURCHASES WHERE id = $1 AND admin_id = $2 RETURNING *',
            [id, adminId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete wholesale purchase' });
    }
};
