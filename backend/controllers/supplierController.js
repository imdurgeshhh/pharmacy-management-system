const { pool } = require('../config/db');

exports.getSuppliers = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM SUPPLIERS ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
};

exports.getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM SUPPLIERS WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
};

exports.addSupplier = async (req, res) => {
    const { name, contact_person, phone, email, address } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO SUPPLIERS (name, contact_person, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, contact_person, phone, email, address]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add supplier' });
    }
};

exports.updateSupplier = async (req, res) => {
    const { id } = req.params;
    const { name, contact_person, phone, email, address } = req.body;
    try {
        const result = await pool.query(
            'UPDATE SUPPLIERS SET name = $1, contact_person = $2, phone = $3, email = $4, address = $5 WHERE id = $6 RETURNING *',
            [name, contact_person, phone, email, address, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
};

exports.deleteSupplier = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM SUPPLIERS WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ message: 'Supplier deleted successfully', supplier: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
};
