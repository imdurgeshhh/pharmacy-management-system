const { Pool } = require('pg');
require('dotenv').config();

// In test mode, ensure we do not connect to production DATABASE_URL
const isTestEnv = process.env.NODE_ENV === 'test' || (process.env.DB_NAME && process.env.DB_NAME.toLowerCase().includes('test'));
const connectionString = (isTestEnv && process.env.DATABASE_URL && !process.env.DATABASE_URL.toLowerCase().includes('test'))
    ? null
    : process.env.DATABASE_URL;

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
    if (process.env.DB_HOST && process.env.DB_HOST.includes('db.') && process.env.DB_HOST.includes('.supabase.co')) {
        console.warn('⚠️ WARNING: DB_HOST uses direct Supabase host (db.*.supabase.co) which is IPv6-only. On IPv4 hosts (e.g. Render), outbound connections will time out. Use the Supabase pooler host (e.g. aws-1-ap-south-1.pooler.supabase.com) instead.');
    }
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
