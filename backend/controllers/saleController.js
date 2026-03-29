const { pool } = require('../config/db');
const generateInvoice = require('../utils/invoiceGenerator');

exports.generateInvoicePDF = async (req, res) => {
    const { saleId } = req.params;
    
    try {
        // Get sale details
        const saleQuery = `
            SELECT s.*, c.name as customer_name, c.phone as customer_phone
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.id
            WHERE s.id = $1
        `;
        const saleResult = await pool.query(saleQuery, [saleId]);
        
        if (saleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        
        const sale = saleResult.rows[0];
        
        // Get sale items with inventory details
        const itemsQuery = `
            SELECT si.*, i.name, i.batch_number, i.expiry_date
            FROM SALE_ITEMS si
            JOIN INVENTORY i ON si.inventory_id = i.id
            WHERE si.sale_id = $1
        `;
        const itemsResult = await pool.query(itemsQuery, [saleId]);
        
        const items = itemsResult.rows.map(item => ({
            name: item.name,
            batch: item.batch_number,
            expiry: item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB') : 'N/A',
            qty: item.qty,
            price: parseFloat(item.price),
            gst: '12%'
        }));
        
        // Prepare invoice data
        const invoiceData = {
            name: sale.customer_name || 'Walk-in Customer',
            phone: sale.customer_phone || 'N/A',
            date: new Date(sale.created_at).toLocaleDateString('en-GB'),
            invoiceNo: `INV${sale.id.toString().padStart(5, '0')}`,
            items: items
        };
        
        // Generate PDF
        generateInvoice(invoiceData, res);
        
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ error: 'Failed to generate invoice' });
    }
};

exports.createSale = async (req, res) => {
    const { customer_name, customer_phone, employee_id, total_amount, tax_amount, items } = req.body;
    // items: [{ inventory_id, qty, price, tax }]

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Handle Customer
        let customerId = null;
        if (customer_phone) {
            const custCheck = await client.query('SELECT id FROM CUSTOMERS WHERE phone = $1', [customer_phone]);
            if (custCheck.rows.length > 0) {
                customerId = custCheck.rows[0].id;
            } else {
                const newCust = await client.query(
                    'INSERT INTO CUSTOMERS (name, phone) VALUES ($1, $2) RETURNING id',
                    [customer_name || 'Walk-in Customer', customer_phone]
                );
                customerId = newCust.rows[0].id;
            }
        }

        // 2. Create Sale Record
        const saleRes = await client.query(
            'INSERT INTO SALES (customer_id, employee_id, total_amount, tax_amount) VALUES ($1, $2, $3, $4) RETURNING id',
            [customerId, employee_id, total_amount, tax_amount]
        );
        const saleId = saleRes.rows[0].id;

        // 3. Insert Sale Items and Deduct Inventory
        for (const item of items) {
            // Check current stock
            const invCheck = await client.query('SELECT stock_qty FROM INVENTORY WHERE id = $1', [item.inventory_id]);
            if (invCheck.rows.length === 0 || invCheck.rows[0].stock_qty < item.qty) {
                throw new Error(`Insufficient stock for inventory item ${item.inventory_id}`);
            }

            // Deduct stock
            await client.query('UPDATE INVENTORY SET stock_qty = stock_qty - $1 WHERE id = $2', [item.qty, item.inventory_id]);

            // Create Sale Item
            await client.query(
                'INSERT INTO SALE_ITEMS (sale_id, inventory_id, qty, price, tax) VALUES ($1, $2, $3, $4, $5)',
                [saleId, item.inventory_id, item.qty, item.price, item.tax]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Sale completed successfully', saleId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to complete sale' });
    } finally {
        client.release();
    }
};

exports.getSales = async (req, res) => {
    try {
        const query = `
            SELECT s.id, s.total_amount, s.tax_amount, s.created_at, c.name as customer_name, e.name as employee_name
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.id
            LEFT JOIN EMPLOYEES e ON s.employee_id = e.id
            ORDER BY s.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
};

exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const saleQuery = `
            SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   e.name as employee_name
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.id
            LEFT JOIN EMPLOYEES e ON s.employee_id = e.id
            WHERE s.id = $1
        `;
        const saleResult = await pool.query(saleQuery, [id]);
        
        if (saleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Get sale items with medicine details
        const itemsQuery = `
            SELECT si.*, m.medicine_name, m.brand_name, i.batch_number, i.expiry_date
            FROM SALE_ITEMS si
            JOIN INVENTORY i ON si.inventory_id = i.id
            JOIN MEDICINES m ON i.medicine_id = m.id
            WHERE si.sale_id = $1
        `;
        const itemsResult = await pool.query(itemsQuery, [id]);

        res.json({
            ...saleResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sale' });
    }
};

exports.updateSale = async (req, res) => {
    const { id } = req.params;
    const { customer_id, employee_id, total_amount, tax_amount } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE SALES SET customer_id = $1, employee_id = $2, total_amount = $3, tax_amount = $4 WHERE id = $5 RETURNING *',
            [customer_id, employee_id, total_amount, tax_amount, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update sale' });
    }
};

exports.deleteSale = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get sale items first to revert inventory
        const itemsResult = await client.query(
            'SELECT inventory_id, qty FROM SALE_ITEMS WHERE sale_id = $1',
            [id]
        );

        // Revert inventory stock
        for (const item of itemsResult.rows) {
            await client.query(
                'UPDATE INVENTORY SET stock_qty = stock_qty + $1 WHERE id = $2',
                [item.qty, item.inventory_id]
            );
        }

        // Delete sale items
        await client.query('DELETE FROM SALE_ITEMS WHERE sale_id = $1', [id]);
        
        // Delete sale
        const result = await client.query('DELETE FROM SALES WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sale not found' });
        }

        await client.query('COMMIT');
        res.json({ message: 'Sale deleted successfully', sale: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to delete sale' });
    } finally {
        client.release();
    }
};
