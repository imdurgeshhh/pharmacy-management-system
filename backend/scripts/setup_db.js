const { Client } = require('pg');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'pharma_db';

const defaultClient = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false }
});

const schemaQuery = `
  CREATE TABLE IF NOT EXISTS EMPLOYEES (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS CUSTOMERS (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) UNIQUE,
      email VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS SUPPLIERS (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      contact_person VARCHAR(100),
      phone VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(100),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS MEDICINES (
      id SERIAL PRIMARY KEY,
      medicine_name VARCHAR(100) NOT NULL,
      brand_name VARCHAR(100),
      salt_composition VARCHAR(200),
      medicine_category VARCHAR(50),
      dosage_form VARCHAR(50),
      strength VARCHAR(50),
      barcode VARCHAR(50) UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS INVENTORY (
      id SERIAL PRIMARY KEY,
      medicine_id INT REFERENCES MEDICINES(id) ON DELETE CASCADE,
      supplier_id INT REFERENCES SUPPLIERS(id) ON DELETE SET NULL,
      batch_number VARCHAR(50) NOT NULL,
      stock_qty INT NOT NULL DEFAULT 0,
      expiry_date DATE NOT NULL,
      purchase_price DECIMAL(10, 2) NOT NULL,
      mrp DECIMAL(10, 2) NOT NULL,
      tax_percentage DECIMAL(5, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(medicine_id, batch_number)
  );

  CREATE TABLE IF NOT EXISTS PURCHASES (
      id SERIAL PRIMARY KEY,
      supplier_id INT REFERENCES SUPPLIERS(id) ON DELETE SET NULL,
      total_amount DECIMAL(12, 2) NOT NULL,
      tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS PURCHASE_ITEMS (
      id SERIAL PRIMARY KEY,
      purchase_id INT REFERENCES PURCHASES(id) ON DELETE CASCADE,
      medicine_id INT REFERENCES MEDICINES(id) ON DELETE CASCADE,
      batch_number VARCHAR(50) NOT NULL,
      qty INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      tax DECIMAL(10, 2) NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS SALES (
      id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES CUSTOMERS(id) ON DELETE SET NULL,
      employee_id INT REFERENCES EMPLOYEES(id) ON DELETE SET NULL,
      total_amount DECIMAL(12, 2) NOT NULL,
      tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS SALE_ITEMS (
      id SERIAL PRIMARY KEY,
      sale_id INT REFERENCES SALES(id) ON DELETE CASCADE,
      inventory_id INT REFERENCES INVENTORY(id) ON DELETE CASCADE,
      qty INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      tax DECIMAL(10, 2) NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ALERTS (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      medicine_id INT REFERENCES MEDICINES(id) ON DELETE CASCADE,
      inventory_id INT REFERENCES INVENTORY(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_resolved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Seed an initial admin user
  INSERT INTO EMPLOYEES (name, username, password, role)
  VALUES ('Admin User', 'admin', 'admin123', 'admin')
  ON CONFLICT (username) DO NOTHING;
`;

async function setupDatabase() {
    try {
        console.log('Connecting to default postgres database...');
        await defaultClient.connect();

        // Check if database exists
        const res = await defaultClient.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);

        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating it...`);
            await defaultClient.query(`CREATE DATABASE ${dbName}`);
            console.log(`Database ${dbName} created successfully.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }

        await defaultClient.end();

        // Now connect to the new database to run schema
        const targetClient = new Client({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: dbName,
            password: process.env.DB_PASSWORD || 'postgres',
            port: process.env.DB_PORT || 5432,
            ssl: { rejectUnauthorized: false }
        });

        await targetClient.connect();
        console.log(`Connected to ${dbName}. Running schema definition...`);
        await targetClient.query(schemaQuery);
        console.log('Schema setup and initial seed data inserted successfully!');
        await targetClient.end();
    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

setupDatabase();
