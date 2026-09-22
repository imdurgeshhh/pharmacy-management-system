const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

let pool;
if (connectionString) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20
    });
} else {
    const requiredDbEnv = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'];
    const missingDbEnv = requiredDbEnv.filter((key) => !process.env[key]);
    if (missingDbEnv.length > 0) {
        throw new Error(`Missing required database env vars: ${missingDbEnv.join(', ')} or DATABASE_URL. Copy backend/.env.example to backend/.env and fill in values.`);
    }

    const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20
    });
}

pool.on('connect', () => {
    console.log('Connected to PostgreSQL Database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client in pool:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
