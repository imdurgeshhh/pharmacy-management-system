const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool } = require('./config/db');

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Handle static files for uploads (e.g., invoices)
app.use('/uploads', express.static('uploads'));

// Basic Route for testing
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'OK', timestamp: result.rows[0].now, message: 'Server is running and DB is connected' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: 'ERROR', message: 'Database connection failed' });
    }
});

// Import Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/ocr', require('./routes/ocrRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/wholesale', require('./routes/wholesaleRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
