const { pool } = require('../config/db');

// ── Helper: find an existing medicine by name (case-insensitive) or create one ──
// Live DB column is `name` (not `medicine_name`)
async function findOrCreateMedicine(client, medicineName) {
    const name = (medicineName || '').trim();
    if (!name) throw new Error('Medicine name is required');

    // Search by `name` column (real DB schema)
    const existing = await client.query(
        `SELECT id FROM medicines WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [name]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;

    // Not found — create a minimal record using real column names
    // barcode left NULL to avoid UNIQUE constraint on multiple inserts
    const created = await client.query(
        `INSERT INTO medicines (name, category, barcode, description)
         VALUES ($1, 'General', NULL, '') RETURNING id`,
        [name]
    );
    return created.rows[0].id;
}

// ── Helper: find or create a fallback supplier ────────────────────────────────
// SUPPLIERS.phone is UNIQUE NOT NULL, so we use a unique dummy value
async function getOrCreateFallbackSupplier(client) {
    const existing = await client.query(
        `SELECT id FROM SUPPLIERS WHERE LOWER(name) = 'unknown supplier' LIMIT 1`
    );
    if (existing.rows.length > 0) return existing.rows[0].id;

    // phone must be unique & not null — use a timestamp-based dummy
    const dummyPhone = `0000-${Date.now()}`;
    const created = await client.query(
        `INSERT INTO SUPPLIERS (name, contact_person, phone, email, address)
         VALUES ('Unknown Supplier', '', $1, '', '') RETURNING id`,
        [dummyPhone]
    );
    return created.rows[0].id;
}

exports.createPurchase = async (req, res) => {
    const { supplier_id, total_amount, tax_amount, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items provided' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Resolve supplier_id ──────────────────────────────────────────────
        let resolvedSupplierId = parseInt(supplier_id) || null;
        if (!resolvedSupplierId) {
            resolvedSupplierId = await getOrCreateFallbackSupplier(client);
        } else {
            // Verify supplier exists
            const suppCheck = await client.query('SELECT id FROM SUPPLIERS WHERE id = $1', [resolvedSupplierId]);
            if (suppCheck.rows.length === 0) {
                resolvedSupplierId = await getOrCreateFallbackSupplier(client);
            }
        }

        // ── Create Purchase record ───────────────────────────────────────────
        const purchaseRes = await client.query(
            'INSERT INTO PURCHASES (supplier_id, total_amount, tax_amount) VALUES ($1, $2, $3) RETURNING id',
            [resolvedSupplierId, total_amount || 0, tax_amount || 0]
        );
        const purchaseId = purchaseRes.rows[0].id;

        // ── Insert each item ─────────────────────────────────────────────────
        for (const item of items) {
            // Resolve medicine_id: use provided id, else find/create by name
            let medicineId = parseInt(item.medicine_id) || null;
            if (!medicineId) {
                medicineId = await findOrCreateMedicine(client, item.medicine_name || item.name);
            } else {
                // Verify medicine exists
                const medCheck = await client.query('SELECT id FROM MEDICINES WHERE id = $1', [medicineId]);
                if (medCheck.rows.length === 0) {
                    medicineId = await findOrCreateMedicine(client, item.medicine_name || item.name);
                }
            }

            const batchNo  = item.batch_number || `AUTO-${Date.now()}`;
            const qty      = parseFloat(item.qty) || 1;
            const price    = parseFloat(item.price) || 0;
            const tax      = parseFloat(item.tax) || 0;
            const mrp      = parseFloat(item.mrp) || price;
            const taxPct   = parseFloat(item.tax_percentage) || 0;
            // INVENTORY.expiry_date is NOT NULL — default to 1 year from today if not set
            const expiry   = item.expiry_date || new Date(Date.now() + 365*24*60*60*1000).toISOString().slice(0, 10);

            await client.query(
                'INSERT INTO PURCHASE_ITEMS (purchase_id, medicine_id, batch_number, qty, price, tax) VALUES ($1, $2, $3, $4, $5, $6)',
                [purchaseId, medicineId, batchNo, qty, price, tax]
            );

            // Update or Create Inventory Record
            const invCheck = await client.query(
                'SELECT id FROM INVENTORY WHERE medicine_id = $1 AND batch_number = $2',
                [medicineId, batchNo]
            );

            if (invCheck.rows.length > 0) {
                await client.query(
                    'UPDATE INVENTORY SET stock_qty = stock_qty + $1, purchase_price = $2, mrp = $3 WHERE id = $4',
                    [qty, price, mrp, invCheck.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO INVENTORY
                       (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, tax_percentage)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [medicineId, resolvedSupplierId, batchNo, qty, expiry, price, mrp, taxPct]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Purchase recorded successfully', purchaseId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[createPurchase ERROR]', error.message, error.stack);
        res.status(500).json({ error: error.message || 'Failed to record purchase' });
    } finally {
        client.release();
    }
};

exports.getPurchases = async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.total_amount, p.tax_amount, p.created_at, s.name as supplier_name 
            FROM PURCHASES p 
            LEFT JOIN SUPPLIERS s ON p.supplier_id = s.id 
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
};

exports.getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const purchaseQuery = `
            SELECT p.*, s.name as supplier_name 
            FROM PURCHASES p 
            LEFT JOIN SUPPLIERS s ON p.supplier_id = s.id 
            WHERE p.id = $1
        `;
        const purchaseResult = await pool.query(purchaseQuery, [id]);
        
        if (purchaseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        // Get purchase items
        const itemsQuery = `
            SELECT pi.*, m.medicine_name, m.brand_name 
            FROM PURCHASE_ITEMS pi 
            JOIN MEDICINES m ON pi.medicine_id = m.id 
            WHERE pi.purchase_id = $1
        `;
        const itemsResult = await pool.query(itemsQuery, [id]);

        res.json({
            ...purchaseResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch purchase' });
    }
};

exports.updatePurchase = async (req, res) => {
    const { id } = req.params;
    const { supplier_id, total_amount, tax_amount } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE PURCHASES SET supplier_id = $1, total_amount = $2, tax_amount = $3 WHERE id = $4 RETURNING *',
            [supplier_id, total_amount, tax_amount, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update purchase' });
    }
};

exports.deletePurchase = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get purchase items first to revert inventory
        const itemsResult = await client.query(
            'SELECT medicine_id, batch_number, qty FROM PURCHASE_ITEMS WHERE purchase_id = $1',
            [id]
        );

        // Revert inventory stock
        for (const item of itemsResult.rows) {
            await client.query(
                'UPDATE INVENTORY SET stock_qty = stock_qty - $1 WHERE medicine_id = $2 AND batch_number = $3',
                [item.qty, item.medicine_id, item.batch_number]
            );
        }

        // Delete purchase items (cascade should handle this, but doing explicitly)
        await client.query('DELETE FROM PURCHASE_ITEMS WHERE purchase_id = $1', [id]);
        
        // Delete purchase
        const result = await client.query('DELETE FROM PURCHASES WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Purchase not found' });
        }

        await client.query('COMMIT');
        res.json({ message: 'Purchase deleted successfully', purchase: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to delete purchase' });
    } finally {
        client.release();
    }
};
