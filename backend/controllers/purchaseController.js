const { pool } = require('../config/db');
const { normalizeQty, fromTotalUnits, formatQty } = require('../utils/quantity');

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
    const requestedUnitsPerStrip = extra.units_per_strip !== undefined && extra.units_per_strip !== null
        ? Math.max(1, parseInt(extra.units_per_strip, 10) || 1)
        : null;

    const existing = await client.query(
        `SELECT id, schedule, units_per_strip FROM medicines WHERE LOWER(name) = LOWER($1) AND admin_id = $2 LIMIT 1`,
        [name, adminId]
    );
    if (existing.rows.length > 0) {
        const medId = existing.rows[0].id;
        const currentUps = parseInt(existing.rows[0].units_per_strip, 10) || 1;
        let updateUps = null;

        if (requestedUnitsPerStrip !== null && requestedUnitsPerStrip !== currentUps) {
            // Check if there is active stock
            const stockCheck = await client.query(
                'SELECT COALESCE(SUM(stock_qty), 0) as total_stock FROM INVENTORY WHERE medicine_id = $1 AND admin_id = $2',
                [medId, adminId]
            );
            const currentStock = parseInt(stockCheck.rows[0]?.total_stock, 10) || 0;
            if (currentStock === 0 || extra.confirm_pack_size_change === true) {
                updateUps = requestedUnitsPerStrip;
            }
        }

        if (brandName || saltComp || category !== 'General' || dosageForm || strength || updateUps !== null) {
            await client.query(
                `UPDATE medicines SET
                    brand_name = COALESCE(NULLIF($1, ''), brand_name),
                    salt_composition = COALESCE(NULLIF($2, ''), salt_composition),
                    category = COALESCE(NULLIF($3, ''), category),
                    medicine_category = COALESCE(NULLIF($3, ''), medicine_category),
                    dosage_form = COALESCE(NULLIF($4, ''), dosage_form),
                    strength = COALESCE(NULLIF($5, ''), strength),
                    units_per_strip = COALESCE($6, units_per_strip)
                 WHERE id = $7 AND admin_id = $8`,
                [brandName, saltComp, category, dosageForm, strength, updateUps, medId, adminId]
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

    const unitsPerStrip = requestedUnitsPerStrip || 1;
    const created = await client.query(
        `INSERT INTO medicines (
            name, medicine_name, brand_name, salt_composition,
            category, medicine_category, dosage_form, strength,
            barcode, description, schedule, units_per_strip, admin_id
         )
         VALUES ($1, $1, $2, $3, $4, $4, $5, $6, NULL, '', $7, $8, $9) RETURNING id`,
        [name, brandName, saltComp, category, dosageForm, strength, medSchedule, unitsPerStrip, adminId]
    );
    return created.rows[0].id;
}

exports.createPurchase = async (req, res) => {
    const adminId = req.adminId;
    const { supplier_id, total_amount, tax_amount, items } = req.body;

    if (!items || items.length === 0) {
        console.warn('[Purchases 400] No items provided');
        return res.status(400).json({ error: 'No items provided' });
    }

    const resolvedSupplierId = parseInt(supplier_id, 10);
    if (!resolvedSupplierId) {
        console.warn(`[Purchases 400] supplier_id is required, received: ${supplier_id}`);
        return res.status(400).json({ error: 'supplier_id is required. Please select a supplier.' });
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
            console.warn(`[Purchases 400] Supplier ${resolvedSupplierId} not found for admin ${adminId}`);
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
                    // Fall back to finding or creating by name within this tenant
                    const medName = item.name || item.medicine_name;
                    medicineId = await findOrCreateMedicine(client, medName, item.schedule, adminId, item);
                } else {
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
            }

            // Fetch master units_per_strip for this medicine
            const medInfo = await client.query(
                'SELECT COALESCE(units_per_strip, 1) as units_per_strip FROM MEDICINES WHERE id = $1 AND admin_id = $2',
                [medicineId, adminId]
            );
            const unitsPerStrip = parseInt(medInfo.rows[0]?.units_per_strip, 10) || 1;

            const batchNumber = (item.batch_number || `BATCH-${Date.now()}`).trim();
            const purchasePrice = parseFloat(item.price || item.purchase_price || 0);
            const itemTax = parseFloat(item.tax || 0);

            // Compute total base units (tablets)
            const rawStrips = item.strips !== undefined ? item.strips : (item.strips_qty !== undefined ? item.strips_qty : undefined);
            const rawLoose = item.loose !== undefined ? item.loose : (item.loose_qty !== undefined ? item.loose_qty : undefined);

            let totalUnits = 0;
            let stripsQty = 0;
            let looseQty = 0;

            if ((rawStrips !== undefined && parseInt(rawStrips, 10) > 0) || (rawLoose !== undefined && parseInt(rawLoose, 10) > 0)) {
                const norm = normalizeQty({ strips: rawStrips || 0, loose: rawLoose || 0, unitsPerStrip });
                totalUnits = norm.totalUnits;
                stripsQty = norm.strips;
                looseQty = norm.loose;
            } else if (item.qty !== undefined || item.quantity !== undefined) {
                totalUnits = parseInt(item.qty !== undefined ? item.qty : item.quantity, 10);
                const decomp = fromTotalUnits(totalUnits, unitsPerStrip);
                stripsQty = decomp.strips;
                looseQty = decomp.loose;
            } else if (rawStrips !== undefined || rawLoose !== undefined) {
                const norm = normalizeQty({ strips: rawStrips || 0, loose: rawLoose || 0, unitsPerStrip });
                totalUnits = norm.totalUnits;
                stripsQty = norm.strips;
                looseQty = norm.loose;
            }

            if (isNaN(totalUnits) || totalUnits <= 0) {
                const medDisplayName = item.medicine_name || item.name || batchNumber;
                console.warn(`[Purchases 400] Invalid quantity for item: ${medDisplayName}, totalUnits: ${totalUnits}`);
                const err = new Error(`Invalid quantity for item: ${medDisplayName}`);
                err.statusCode = 400;
                throw err;
            }

            const rawSellingPrice = item.selling_price !== undefined ? item.selling_price : item.mrp;
            const sellingPrice = parseFloat(rawSellingPrice !== undefined && rawSellingPrice !== '' ? rawSellingPrice : (purchasePrice > 0 ? +(purchasePrice * 1.25).toFixed(2) : 0));
            if (isNaN(sellingPrice) || sellingPrice < 0) {
                console.warn(`[Purchases 400] Invalid selling_price for item: ${item.name || item.medicine_name || batchNumber}, received: ${rawSellingPrice}`);
                const err = new Error(`selling_price must be a valid number >= 0 for item: ${item.name || item.medicine_name || batchNumber}`);
                err.statusCode = 400;
                throw err;
            }

            const rawMrp = item.mrp !== undefined ? item.mrp : (item.selling_price !== undefined ? item.selling_price : undefined);
            const itemMrp = parseFloat(rawMrp !== undefined && rawMrp !== '' ? rawMrp : sellingPrice);
            if (isNaN(itemMrp) || itemMrp < 0) {
                console.warn(`[Purchases 400] Invalid mrp for item: ${item.name || item.medicine_name || batchNumber}, received: ${rawMrp}`);
                const err = new Error(`mrp must be a valid number >= 0 for item: ${item.name || item.medicine_name || batchNumber}`);
                err.statusCode = 400;
                throw err;
            }

            // Insert Purchase Item with units_per_strip, strips_qty, loose_qty, selling_price, mrp
            await client.query(
                `INSERT INTO PURCHASE_ITEMS (purchase_id, medicine_id, batch_number, qty, price, tax, units_per_strip, strips_qty, loose_qty, selling_price, mrp)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [purchaseId, medicineId, batchNumber, totalUnits, purchasePrice, itemTax, unitsPerStrip, stripsQty, looseQty, sellingPrice, itemMrp]
            );

            // Upsert Inventory for this tenant in base units
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
                     SET stock_qty = stock_qty + $1, purchase_price = $2, selling_price = $3, mrp = $4, expiry_date = $5,
                         tax_percentage = $6, trade_rate = COALESCE($7, trade_rate), old_mrp = COALESCE($8, old_mrp)
                     WHERE id = $9 AND admin_id = $10`,
                    [totalUnits, purchasePrice, sellingPrice, itemMrp, expiryDate, taxPercentage, tradeRate, oldMrp, invCheck.rows[0].id, adminId]
                );
            } else {
                await client.query(
                    `INSERT INTO INVENTORY 
                     (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, selling_price, mrp, tax_percentage, trade_rate, old_mrp, admin_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [medicineId, resolvedSupplierId, batchNumber, totalUnits, expiryDate, purchasePrice, sellingPrice, itemMrp, taxPercentage, tradeRate, oldMrp, adminId]
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
            SELECT pi.*, COALESCE(m.medicine_name, m.name) as medicine_name, m.brand_name,
                   COALESCE(pi.units_per_strip, m.units_per_strip, 1) as units_per_strip,
                   COALESCE(pi.strips_qty, 0) as strips_qty,
                   COALESCE(pi.loose_qty, 0) as loose_qty,
                   COALESCE(pi.mrp, pi.selling_price, 0) as mrp
            FROM PURCHASE_ITEMS pi
            JOIN MEDICINES m ON pi.medicine_id = m.id
            WHERE pi.purchase_id = $1
        `;
        const itemsResult = await pool.query(itemsQuery, [id]);
        const items = itemsResult.rows.map(it => ({
            ...it,
            formatted_qty: formatQty(it.qty, it.units_per_strip)
        }));

        res.json({
            ...purchaseResult.rows[0],
            items
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch purchase' });
    }
};

exports.updatePurchase = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    const { supplier_id, total_amount, tax_amount, items } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        // IDOR check: must belong to authenticated tenant
        const result = await client.query(
            'UPDATE PURCHASES SET supplier_id = COALESCE($1, supplier_id), total_amount = COALESCE($2, total_amount), tax_amount = COALESCE($3, tax_amount) WHERE id = $4 AND admin_id = $5 RETURNING *',
            [supplier_id || null, total_amount !== undefined ? total_amount : null, tax_amount !== undefined ? tax_amount : null, id, adminId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Purchase not found' });
        }

        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                if (item.id) {
                    const rawMrp = item.mrp !== undefined ? item.mrp : item.selling_price;
                    const itemMrp = (rawMrp !== undefined && rawMrp !== '') ? parseFloat(rawMrp) : null;
                    const rawSP = item.selling_price !== undefined ? item.selling_price : item.mrp;
                    const sp = (rawSP !== undefined && rawSP !== '') ? parseFloat(rawSP) : null;
                    if (itemMrp !== null || sp !== null) {
                        await client.query(
                            `UPDATE PURCHASE_ITEMS 
                             SET mrp = COALESCE($1, mrp), selling_price = COALESCE($2, selling_price)
                             WHERE id = $3 AND purchase_id = $4`,
                            [itemMrp, sp, item.id, id]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to update purchase' });
    } finally {
        client.release();
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
