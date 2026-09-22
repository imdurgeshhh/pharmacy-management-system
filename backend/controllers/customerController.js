const { pool } = require('../config/db');

exports.getCustomers = async (req, res) => {
    try {
        const adminId = req.adminId;
        const result = await pool.query(
            'SELECT * FROM CUSTOMERS WHERE admin_id = $1 ORDER BY created_at DESC',
            [adminId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.adminId;
        const result = await pool.query(
            'SELECT * FROM CUSTOMERS WHERE id = $1 AND admin_id = $2',
            [id, adminId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
};

exports.addCustomer = async (req, res) => {
    const adminId = req.adminId;
    const { name, phone, email } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO CUSTOMERS (name, phone, email, admin_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, phone, email, adminId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add customer' });
    }
};

exports.updateCustomer = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    const { name, phone, email } = req.body;
    try {
        const result = await pool.query(
            'UPDATE CUSTOMERS SET name = $1, phone = $2, email = $3 WHERE id = $4 AND admin_id = $5 RETURNING *',
            [name, phone, email, id, adminId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
};

exports.deleteCustomer = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    try {
        const result = await pool.query(
            'DELETE FROM CUSTOMERS WHERE id = $1 AND admin_id = $2 RETURNING *',
            [id, adminId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
};
