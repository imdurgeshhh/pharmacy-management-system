const { pool } = require('../config/db');

exports.getSuppliers = async (req, res) => {
    try {
        const adminId = req.adminId;
        const result = await pool.query(
            'SELECT * FROM SUPPLIERS WHERE admin_id = $1 ORDER BY name',
            [adminId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
};

exports.getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.adminId;

        // Graceful error if ID is non-numeric
        if (isNaN(Number(id))) {
            return res.status(400).json({ error: 'Invalid supplier ID' });
        }

        const result = await pool.query(
            'SELECT * FROM SUPPLIERS WHERE id = $1 AND admin_id = $2',
            [id, adminId]
        );
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
    const adminId = req.adminId;
    const { name, contact_person, phone, email, address } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO SUPPLIERS (name, contact_person, phone, email, address, admin_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, contact_person || null, phone, email || null, address || null, adminId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('addSupplier error:', error.message);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'A supplier with this phone number already exists' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Invalid business tenant reference' });
        }
        if (error.code === '22001') {
            return res.status(400).json({ error: 'One or more fields exceed maximum character length' });
        }
        res.status(500).json({ error: error.message || 'Failed to add supplier' });
    }
};

exports.updateSupplier = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    const { name, contact_person, phone, email, address } = req.body;
    try {
        const result = await pool.query(
            'UPDATE SUPPLIERS SET name = $1, contact_person = $2, phone = $3, email = $4, address = $5 WHERE id = $6 AND admin_id = $7 RETURNING *',
            [name, contact_person || null, phone, email || null, address || null, id, adminId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('updateSupplier error:', error.message);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'A supplier with this phone number already exists' });
        }
        if (error.code === '22001') {
            return res.status(400).json({ error: 'One or more fields exceed maximum character length' });
        }
        res.status(500).json({ error: error.message || 'Failed to update supplier' });
    }
};

exports.deleteSupplier = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    try {
        const result = await pool.query(
            'DELETE FROM SUPPLIERS WHERE id = $1 AND admin_id = $2 RETURNING *',
            [id, adminId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json({ message: 'Supplier deleted successfully', supplier: result.rows[0] });
    } catch (error) {
        console.error('deleteSupplier error:', error.message);
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Cannot delete supplier because related purchases or records exist' });
        }
        res.status(500).json({ error: error.message || 'Failed to delete supplier' });
    }
};
