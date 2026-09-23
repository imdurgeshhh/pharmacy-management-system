const { pool } = require('../config/db');

const VALID_SCHEDULES = ['NONE', 'G', 'H', 'H1', 'X'];

// Helper: find an existing medicine by name within this tenant or create one
async function findOrCreateMedicine(client, medicineName, schedule, adminId, extra = {}) {
    const name = (medicineName || '').trim();
    if (!name) throw new Error('Medicine name is required');

    const brandName = (extra.brand_name || extra.brand || '').trim() || null;
    const saltComp = (extra.salt_composition || extra.salt || '').trim() || null;
    const category = (extra.category || extra.medicine_category || 'General').trim() || 'General';
    const dosageForm = (extra.dosage_form || extra.form || '').trim() || null;
    const strength = (extra.strength || '').trim() || null;

    const existing = await client.query(
        `SELECT id, schedule FROM medicines WHERE LOWER(name) = LOWER($1) AND admin_id = $2 LIMIT 1`,
        [name, adminId]
    );
    if (existing.rows.length > 0) {
        const medId = existing.rows[0].id;
        if (brandName || saltComp || category !== 'General' || dosageForm || strength) {
            await client.query(
                `UPDATE medicines SET
                    brand_name = COALESCE(NULLIF($1, ''), brand_name),
                    salt_composition = COALESCE(NULLIF($2, ''), salt_composition),
                    category = COALESCE(NULLIF($3, ''), category),
                    medicine_category = COALESCE(NULLIF($3, ''), medicine_category),
                    dosage_form = COALESCE(NULLIF($4, ''), dosage_form),
                    strength = COALESCE(NULLIF($5, ''), strength)
                 WHERE id = $6 AND admin_id = $7`,
                [brandName, saltComp, category, dosageForm, strength, medId, adminId]
            );
        }
        return medId;
    }

    const medSchedule = (schedule || '').toString().toUpperCase().trim();
    if (!medSchedule || !VALID_SCHEDULES.includes(medSchedule)) {
        const err = new Error(`Schedule is required for new medicine '${name}'. Must be one of: ${VALID_SCHEDULES.join(', ')}`);
        err.statusCode = 400;
        throw err;
    }

    const created = await client.query(
        `INSERT INTO medicines (
            name, medicine_name, brand_name, salt_composition,
            category, medicine_category, dosage_form, strength,
            barcode, description, schedule, admin_id
         )
         VALUES ($1, $1, $2, $3, $4, $4, $5, $6, NULL, '', $7, $8) RETURNING id`,
        [name, brandName, saltComp, category, dosageForm, strength, medSchedule, adminId]
    );
    return created.rows[0].id;
}

exports.createPurchase = async (req, res) => {
    const adminId = req.adminId;
    const { supplier_id, total_amount, tax_amount, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items provided' });
    }

    const resolvedSupplierId = parseInt(supplier_id, 10);
    if (!resolvedSupplierId) {
        return res.status(400).json({ error: 'supplier_id is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check supplier belongs to this tenant
        const suppCheck = await client.query(
            'SELECT id FROM SUPPLIERS WHERE id = $1 AND admin_id = $2',
            [resolvedSupplierId, adminId]
        );
        if (suppCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Supplier not found' });
        }

        const finalTax = parseFloat(tax_amount) || 0;
        // Create Purchase record with admin_id
        const purchaseRes = await client.query(
            'INSERT INTO PURCHASES (supplier_id, total_amount, tax_amount, admin_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [resolvedSupplierId, total_amount, finalTax, adminId]
        );
        const purchaseId = purchaseRes.rows[0].id;

        for (const item of items) {
            let medicineId = item.medicine_id ? parseInt(item.medicine_id, 10) : null;

            if (!medicineId) {
                const medName = item.name || item.medicine_name;
                medicineId = await findOrCreateMedicine(client, medName, item.schedule, adminId, item);
            } else {
                // Verify provided medicine_id belongs to this tenant
                const medOwnerCheck = await client.query(
                    'SELECT id FROM MEDICINES WHERE id = $1 AND admin_id = $2',
                    [medicineId, adminId]
                );
                if (medOwnerCheck.rows.length === 0) {
                    const err = new Error('Invalid medicine ID');
                    err.statusCode = 400;
                    throw err;
                }

                const brandName = (item.brand_name || item.brand || '').trim() || null;
                const saltComp = (item.salt_composition || item.salt || '').trim() || null;
                const category = (item.category || item.medicine_category || '').trim() || null;
                const dosageForm = (item.dosage_form || item.form || '').trim() || null;
                const strength = (item.strength || '').trim() || null;

                if (brandName || saltComp || category || dosageForm || strength) {
                    await client.query(
                        `UPDATE medicines SET
                            brand_name = COALESCE(NULLIF($1, ''), brand_name),
                            salt_composition = COALESCE(NULLIF($2, ''), salt_composition),
                            category = COALESCE(NULLIF($3, ''), category),
                            medicine_category = COALESCE(NULLIF($3, ''), medicine_category),
                            dosage_form = COALESCE(NULLIF($4, ''), dosage_form),
                            strength = COALESCE(NULLIF($5, ''), strength)
                         WHERE id = $6 AND admin_id = $7`,
                        [brandName, saltComp, category, dosageForm, strength, medicineId, adminId]
                    );
                }
            }

            const batchNumber = (item.batch_number || `BATCH-${Date.now()}`).trim();
            const qty = parseInt(item.qty, 10);
            const purchasePrice = parseFloat(item.price || item.purchase_price);
            const itemTax = parseFloat(item.tax || 0);

            if (!qty || qty <= 0) {
                const err = new Error(`Invalid quantity for item: ${item.name || batchNumber}`);
                err.statusCode = 400;
                throw err;
            }

            // Insert Purchase Item
            await client.query(
                `INSERT INTO PURCHASE_ITEMS (purchase_id, medicine_id, batch_number, qty, price, tax)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [purchaseId, medicineId, batchNumber, qty, purchasePrice, itemTax]
            );

            // Upsert Inventory for this tenant
            const mrp = parseFloat(item.mrp || purchasePrice * 1.25);
            const expiryDate = item.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const taxPercentage = parseFloat(item.tax_percentage || 12.00);
            const tradeRate = item.trade_rate !== undefined ? parseFloat(item.trade_rate) : null;
            const oldMrp = item.old_mrp !== undefined ? parseFloat(item.old_mrp) : 0;

            const invCheck = await client.query(
                `SELECT id, stock_qty FROM INVENTORY WHERE medicine_id = $1 AND batch_number = $2 AND admin_id = $3`,
                [medicineId, batchNumber, adminId]
            );

            if (invCheck.rows.length > 0) {
                await client.query(
                    `UPDATE INVENTORY 
                     SET stock_qty = stock_qty + $1, purchase_price = $2, mrp = $3, expiry_date = $4,
                         tax_percentage = $5, trade_rate = COALESCE($6, trade_rate), old_mrp = COALESCE($7, old_mrp)
                     WHERE id = $8 AND admin_id = $9`,
                    [qty, purchasePrice, mrp, expiryDate, taxPercentage, tradeRate, oldMrp, invCheck.rows[0].id, adminId]
                );
            } else {
                await client.query(
                    `INSERT INTO INVENTORY 
                     (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, tax_percentage, trade_rate, old_mrp, admin_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [medicineId, resolvedSupplierId, batchNumber, qty, expiryDate, purchasePrice, mrp, taxPercentage, tradeRate, oldMrp, adminId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Purchase created successfully', purchaseId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Purchase creation error:', error.message);
        const status = error.statusCode || 500;
        res.status(status).json({ error: error.message || 'Failed to create purchase' });
    } finally {
        client.release();
    }
};

exports.getPurchases = async (req, res) => {
    try {
        const adminId = req.adminId;
        const query = `
            SELECT p.id, p.total_amount, p.tax_amount, p.created_at,
                   s.name as supplier_name, s.contact_person
            FROM PURCHASES p
            LEFT JOIN SUPPLIERS s ON p.supplier_id = s.id
            WHERE p.admin_id = $1
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query, [adminId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
};

exports.getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.adminId;

        const purchaseQuery = `
            SELECT p.*, s.name as supplier_name, s.contact_person, s.phone as supplier_phone, s.email as supplier_email
            FROM PURCHASES p
            LEFT JOIN SUPPLIERS s ON p.supplier_id = s.id
            WHERE p.id = $1 AND p.admin_id = $2
        `;
        const purchaseResult = await pool.query(purchaseQuery, [id, adminId]);

        if (purchaseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        const itemsQuery = `
            SELECT pi.*, COALESCE(m.medicine_name, m.name) as medicine_name, m.brand_name
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
    const adminId = req.adminId;
    const { supplier_id, total_amount, tax_amount } = req.body;

    try {
        // IDOR check: must belong to authenticated tenant
        const result = await pool.query(
            'UPDATE PURCHASES SET supplier_id = $1, total_amount = $2, tax_amount = $3 WHERE id = $4 AND admin_id = $5 RETURNING *',
            [supplier_id, total_amount, tax_amount, id, adminId]
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
    const adminId = req.adminId;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verify purchase exists in tenant
        const check = await client.query('SELECT * FROM PURCHASES WHERE id = $1 AND admin_id = $2', [id, adminId]);
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Purchase not found' });
        }
        const deletedPurchase = check.rows[0];

        // Get purchase items to revert inventory
        const itemsResult = await client.query(
            'SELECT medicine_id, batch_number, qty FROM PURCHASE_ITEMS WHERE purchase_id = $1',
            [id]
        );

        for (const item of itemsResult.rows) {
            await client.query(
                `UPDATE INVENTORY 
                 SET stock_qty = GREATEST(0, stock_qty - $1) 
                 WHERE medicine_id = $2 AND batch_number = $3 AND admin_id = $4`,
                [item.qty, item.medicine_id, item.batch_number, adminId]
            );
        }

        await client.query('DELETE FROM PURCHASE_ITEMS WHERE purchase_id = $1', [id]);
        await client.query('DELETE FROM PURCHASES WHERE id = $1 AND admin_id = $2', [id, adminId]);

        await client.query('COMMIT');
        res.json({ message: 'Purchase deleted and stock reverted successfully', purchase: deletedPurchase });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to delete purchase' });
    } finally {
        client.release();
    }
};
