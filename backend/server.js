const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool } = require('./config/db');
const { clerkMiddleware } = require('@clerk/express');
const { publicLimiter, apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for secure IP rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Clerk middleware BEFORE all routes — populates req.auth on every request
// CLERK_SECRET_KEY must be set in backend/.env
app.use(clerkMiddleware());

// Health check — public rate limiter with RFC rate-limit headers
app.get('/api/health', publicLimiter, async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'OK', timestamp: result.rows[0].now, message: 'Server is running and DB is connected' });
    } catch (error) {
        console.error('Health check error:', error.message);
        res.status(500).json({ status: 'ERROR', message: 'Database connection failed' });
    }
});

// Import Routes with tiered rate limiters
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/ocr', publicLimiter, require('./routes/ocrRoutes'));
app.use('/api/inventory', apiLimiter, require('./routes/inventoryRoutes'));
app.use('/api/purchases', apiLimiter, require('./routes/purchaseRoutes'));
app.use('/api/sales', apiLimiter, require('./routes/saleRoutes'));
app.use('/api/reports', apiLimiter, require('./routes/reportRoutes'));
app.use('/api/suppliers', apiLimiter, require('./routes/supplierRoutes'));
app.use('/api/customers', apiLimiter, require('./routes/customerRoutes'));
app.use('/api/wholesale', apiLimiter, require('./routes/wholesaleRoutes'));
app.use('/api/employees', apiLimiter, require('./routes/employeeRoutes'));
app.use('/api/store', apiLimiter, require('./routes/storeRoutes'));

// 404 catch-all for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized Global Error Handler (must be mounted after all routes)
app.use(errorHandler);

// Start server only when run directly — not when required by tests (Supertest)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
