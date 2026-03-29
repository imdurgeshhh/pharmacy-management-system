const { pool } = require('../config/db');

// Get all medicines with current stock (combining Medicines and Inventory)
exports.getInventory = async (req, res) => {
    try {
        const query = `
            SELECT 
                m.id, m.medicine_name, m.brand_name, m.salt_composition, 
                m.medicine_category, m.dosage_form, m.strength, m.barcode, 
                COALESCE(SUM(i.stock_qty), 0) as total_stock
            FROM MEDICINES m
            LEFT JOIN INVENTORY i ON m.id = i.medicine_id
            GROUP BY m.id
            ORDER BY m.medicine_name;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
};

// Add a new medicine type
exports.addMedicine = async (req, res) => {
    const { medicine_name, brand_name, salt_composition, medicine_category, dosage_form, strength, barcode, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO MEDICINES (medicine_name, brand_name, salt_composition, medicine_category, dosage_form, strength, barcode, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [medicine_name, brand_name, salt_composition, medicine_category, dosage_form, strength, barcode, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add medicine' });
    }
};

// Get batches of a specific medicine
exports.getMedicineBatches = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM INVENTORY WHERE medicine_id = $1 ORDER BY expiry_date ASC',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
};

// Update medicine info
exports.updateMedicine = async (req, res) => {
    const { id } = req.params;
    const { medicine_name, brand_name, salt_composition, medicine_category, dosage_form, strength, barcode, description } = req.body;
    try {
        const result = await pool.query(
            'UPDATE MEDICINES SET medicine_name=$1, brand_name=$2, salt_composition=$3, medicine_category=$4, dosage_form=$5, strength=$6, barcode=$7, description=$8 WHERE id=$9 RETURNING *',
            [medicine_name, brand_name, salt_composition, medicine_category, dosage_form, strength, barcode, description, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update medicine' });
    }
};

// Delete medicine
exports.deleteMedicine = async (req, res) => {
    const { id } = req.params;
    try {
        // First delete related inventory
        await pool.query('DELETE FROM INVENTORY WHERE medicine_id = $1', [id]);
        // Then delete the medicine
        await pool.query('DELETE FROM MEDICINES WHERE id = $1', [id]);
        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete medicine' });
    }
};

// Get expiring medicines alert (e.g., within next 30 days)
exports.getAlerts = async (req, res) => {
    try {
        // Low stock threshold < 10, or Expiring in 30 days
        const query = `
            SELECT m.medicine_name, i.batch_number, i.stock_qty, i.expiry_date
            FROM INVENTORY i
            JOIN MEDICINES m ON i.medicine_id = m.id
            WHERE i.stock_qty < 20 OR i.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
            ORDER BY i.expiry_date ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};
