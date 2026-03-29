const { pool } = require('../config/db');

exports.getCustomers = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM CUSTOMERS ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM CUSTOMERS WHERE id = $1', [id]);
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
    const { name, phone, email } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO CUSTOMERS (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
            [name, phone, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add customer' });
    }
};

exports.updateCustomer = async (req, res) => {
    const { id } = req.params;
    const { name, phone, email } = req.body;
    try {
        const result = await pool.query(
            'UPDATE CUSTOMERS SET name = $1, phone = $2, email = $3 WHERE id = $4 RETURNING *',
            [name, phone, email, id]
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
    try {
        const result = await pool.query('DELETE FROM CUSTOMERS WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
};
