const { pool } = require('../config/db');
const { formatQty } = require('../utils/quantity');

// Get all medicines with current stock, strictly isolated by tenant admin_id
exports.getInventory = async (req, res) => {
    try {
        const adminId = req.adminId;
        const { schedule, search } = req.query;
        const whereClauses = ['m.admin_id = $1'];
        const params = [adminId];

        if (schedule && schedule.toUpperCase() !== 'ALL') {
            params.push(schedule.toUpperCase().trim());
            whereClauses.push(`COALESCE(m.schedule, 'NONE') = $${params.length}`);
        }

        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            whereClauses.push(`(
                COALESCE(m.medicine_name, m.name) ILIKE $${params.length} OR
                m.brand_name ILIKE $${params.length} OR
                m.salt_composition ILIKE $${params.length} OR
                m.barcode ILIKE $${params.length}
            )`);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const query = `
            SELECT 
                m.id, 
                COALESCE(m.medicine_name, m.name) AS medicine_name,
                COALESCE(m.medicine_name, m.name) AS name,
                m.brand_name, 
                m.salt_composition, 
                COALESCE(m.medicine_category, m.category) AS medicine_category, 
                m.dosage_form, 
                m.strength, 
                m.barcode, 
                m.description,
                COALESCE(m.schedule, 'NONE') AS schedule,
                m.hsn_code,
                m.pack_size,
                COALESCE(m.units_per_strip, 1) AS units_per_strip,
                m.admin_id,
                COALESCE(SUM(i.stock_qty), 0) as total_stock,
                COALESCE(
                    (SELECT selling_price FROM INVENTORY inv WHERE inv.medicine_id = m.id AND inv.admin_id = $1 ORDER BY inv.created_at DESC, inv.id DESC LIMIT 1),
                    COALESCE(MAX(i.selling_price), MAX(i.mrp), 0)
                ) as selling_price,
                COALESCE(
                    (SELECT mrp FROM INVENTORY inv WHERE inv.medicine_id = m.id AND inv.admin_id = $1 ORDER BY inv.created_at DESC, inv.id DESC LIMIT 1),
                    COALESCE(MAX(i.mrp), MAX(i.selling_price), 0)
                ) as mrp,
                COALESCE(
                    (SELECT purchase_price FROM INVENTORY inv WHERE inv.medicine_id = m.id AND inv.admin_id = $1 ORDER BY inv.created_at DESC, inv.id DESC LIMIT 1),
                    COALESCE(MAX(i.purchase_price), 0)
                ) as purchase_price,
                COALESCE(MAX(i.tax_percentage), 12) as tax_percentage,
                MAX(i.id) as inventory_id,
                MAX(i.batch_number) as batch_number
            FROM MEDICINES m
            LEFT JOIN INVENTORY i ON m.id = i.medicine_id AND i.admin_id = $1
            ${whereSql}
            GROUP BY m.id
            ORDER BY COALESCE(m.medicine_name, m.name);
        `;
        const result = await pool.query(query, params);
        const rows = result.rows.map(r => ({
            ...r,
            formatted_stock: formatQty(r.total_stock, r.units_per_strip)
        }));
        res.json(rows);
    } catch (error) {
        console.error('Error in getInventory:', error.message);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
};

// Add a new medicine type for the current tenant
exports.addMedicine = async (req, res) => {
    const adminId = req.adminId;
    const {
        medicine_name,
        name,
        brand_name,
        salt_composition,
        medicine_category,
        category,
        dosage_form,
        strength,
        barcode,
        description,
        schedule,
        hsn_code,
        pack_size,
        units_per_strip
    } = req.body;

    const medName = medicine_name || name;
    const medCategory = medicine_category || category || 'General';
    const validSchedules = ['NONE', 'G', 'H', 'H1', 'X'];
    let medSchedule = (schedule || 'NONE').toString().toUpperCase().trim();
    if (!validSchedules.includes(medSchedule)) {
        medSchedule = 'NONE';
    }
    const unitsPerStrip = Math.max(1, parseInt(units_per_strip, 10) || 1);

    try {
        const result = await pool.query(
            `INSERT INTO MEDICINES (
                medicine_name, name, brand_name, salt_composition, 
                medicine_category, category, dosage_form, strength, 
                barcode, description, schedule, hsn_code, pack_size, units_per_strip, admin_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                medName, medName, brand_name, salt_composition,
                medCategory, medCategory, dosage_form, strength,
                barcode || null, description, medSchedule, hsn_code || '3004', pack_size || '1',
                unitsPerStrip,
                adminId
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error in addMedicine:', error.message);
        res.status(500).json({ error: 'Failed to add medicine' });
    }
};

// Get batches of a specific medicine — IDOR protected
exports.getMedicineBatches = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    try {
        // Verify medicine belongs to authenticated tenant
        const medCheck = await pool.query(
            'SELECT id FROM MEDICINES WHERE id = $1 AND admin_id = $2',
            [id, adminId]
        );
        if (medCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Medicine not found' });
        }

        const result = await pool.query(
            'SELECT * FROM INVENTORY WHERE medicine_id = $1 AND admin_id = $2 ORDER BY expiry_date ASC',
            [id, adminId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error in getMedicineBatches:', error.message);
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
};

// Get single medicine by ID — IDOR protected
exports.getMedicineById = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    try {
        const result = await pool.query(
            'SELECT * FROM MEDICINES WHERE id = $1 AND admin_id = $2',
            [id, adminId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error in getMedicineById:', error.message);
        res.status(500).json({ error: 'Failed to fetch medicine' });
    }
};

// Update medicine info — IDOR protected
exports.updateMedicine = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    const {
        medicine_name,
        name,
        brand_name,
        salt_composition,
        medicine_category,
        category,
        dosage_form,
        strength,
        barcode,
        description,
        schedule,
        hsn_code,
        pack_size,
        units_per_strip
    } = req.body;

    const medName = medicine_name || name;
    const medCategory = medicine_category || category;
    const validSchedules = ['NONE', 'G', 'H', 'H1', 'X'];
    let medSchedule = schedule !== undefined && schedule !== null ? schedule.toString().toUpperCase().trim() : undefined;
    if (medSchedule && !validSchedules.includes(medSchedule)) {
        return res.status(400).json({ error: `Invalid schedule: '${schedule}'. Allowed values: ${validSchedules.join(', ')}` });
    }
    const parsedUnitsPerStrip = units_per_strip !== undefined && units_per_strip !== null
        ? Math.max(1, parseInt(units_per_strip, 10) || 1)
        : null;

    try {
        if (parsedUnitsPerStrip !== null) {
            const currentMed = await pool.query(
                'SELECT units_per_strip FROM MEDICINES WHERE id = $1 AND admin_id = $2',
                [id, adminId]
            );
            if (currentMed.rows.length > 0) {
                const currentUPS = parseInt(currentMed.rows[0].units_per_strip, 10) || 1;
                if (currentUPS !== parsedUnitsPerStrip) {
                    const stockCheck = await pool.query(
                        'SELECT COALESCE(SUM(stock_qty), 0) as total_stock FROM INVENTORY WHERE medicine_id = $1 AND admin_id = $2',
                        [id, adminId]
                    );
                    const currentStock = parseInt(stockCheck.rows[0]?.total_stock, 10) || 0;
                    if (currentStock > 0 && req.body.confirm_pack_size_change !== true) {
                        return res.status(400).json({
                            error: `Cannot change pack size from ${currentUPS} to ${parsedUnitsPerStrip} because medicine has active stock (${currentStock} units). Please confirm by setting confirm_pack_size_change: true.`
                        });
                    }
                }
            }
        }

        const result = await pool.query(
            `UPDATE MEDICINES SET 
                medicine_name=$1, name=$2, brand_name=$3, salt_composition=$4, 
                medicine_category=$5, category=$6, dosage_form=$7, strength=$8, 
                barcode=$9, description=$10,
                schedule=COALESCE($11, schedule),
                hsn_code=COALESCE($12, hsn_code),
                pack_size=COALESCE($13, pack_size),
                units_per_strip=COALESCE($14, units_per_strip)
             WHERE id=$15 AND admin_id=$16 RETURNING *`,
            [
                medName, medName, brand_name, salt_composition,
                medCategory, medCategory, dosage_form, strength,
                barcode, description, medSchedule || null, hsn_code || null,
                pack_size || null, parsedUnitsPerStrip, id, adminId
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Medicine not found' });
        }

        const rawSellingPrice = req.body.selling_price !== undefined ? req.body.selling_price : req.body.mrp;
        if (rawSellingPrice !== undefined && rawSellingPrice !== null && rawSellingPrice !== '') {
            const parsedSellingPrice = parseFloat(rawSellingPrice);
            if (!isNaN(parsedSellingPrice) && parsedSellingPrice >= 0) {
                await pool.query(
                    `UPDATE INVENTORY 
                     SET selling_price = $1, mrp = $1 
                     WHERE medicine_id = $2 AND admin_id = $3`,
                    [parsedSellingPrice, id, adminId]
                );
            }
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error in updateMedicine:', error.message);
        res.status(500).json({ error: 'Failed to update medicine' });
    }
};

// Delete medicine — Admin only, IDOR protected
exports.deleteMedicine = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    try {
        // Check medicine exists in this tenant
        const check = await pool.query('SELECT id FROM MEDICINES WHERE id = $1 AND admin_id = $2', [id, adminId]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Medicine not found' });
        }

        // Delete related inventory in this tenant
        await pool.query('DELETE FROM INVENTORY WHERE medicine_id = $1 AND admin_id = $2', [id, adminId]);
        // Delete medicine in this tenant
        await pool.query('DELETE FROM MEDICINES WHERE id = $1 AND admin_id = $2', [id, adminId]);
        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        console.error('Error in deleteMedicine:', error.message);
        res.status(500).json({ error: 'Failed to delete medicine' });
    }
};

// Get expiring medicines alert — tenant isolated
exports.getAlerts = async (req, res) => {
    try {
        const adminId = req.adminId;
        const query = `
            SELECT 
                COALESCE(m.medicine_name, m.name) AS name,
                COALESCE(m.medicine_name, m.name) AS medicine_name,
                COALESCE(m.units_per_strip, 1) AS units_per_strip,
                i.batch_number, 
                i.stock_qty, 
                i.expiry_date,
                COALESCE(i.selling_price, i.mrp, 0) as selling_price,
                i.mrp,
                i.purchase_price
            FROM INVENTORY i
            JOIN MEDICINES m ON i.medicine_id = m.id
            WHERE i.admin_id = $1 
              AND (i.stock_qty < 20 OR i.expiry_date <= CURRENT_DATE + INTERVAL '90 days')
            ORDER BY i.expiry_date ASC
        `;
        const result = await pool.query(query, [adminId]);
        const rows = result.rows.map(r => ({
            ...r,
            formatted_stock: formatQty(r.stock_qty, r.units_per_strip)
        }));
        res.json(rows);
    } catch (error) {
        console.error('Error in getAlerts:', error.message);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};
