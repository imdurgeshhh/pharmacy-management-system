const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    host: 'db.chiphyjrckarzvdrgriw.supabase.co',
    database: 'postgres',
    password: '@Durgesh9755',
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL Database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
