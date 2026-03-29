const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'pharma_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432
});

const seedInventory = async () => {
    try {
        // First, check if we already have inventory
        const existingInv = await pool.query('SELECT COUNT(*) FROM INVENTORY');
        if (parseInt(existingInv.rows[0].count) > 0) {
            console.log('Inventory already exists, skipping seed...');
            return;
        }

        // Add sample suppliers
        await pool.query(`
            INSERT INTO SUPPLIERS (name, contact_person, phone, email, address)
            VALUES 
                ('ABC Pharma Ltd', 'John Doe', '9876543210', 'abc@pharma.com', 'Mumbai, Maharashtra'),
                ('XYZ Medical Co', 'Jane Smith', '9876543211', 'xyz@medical.com', 'Delhi, NCR'),
                ('HealthCare Distributors', 'Mike Johnson', '9876543212', 'health@dist.com', 'Bangalore, Karnataka')
            ON CONFLICT (phone) DO NOTHING
        `);

        // Add sample medicines
        await pool.query(`
            INSERT INTO MEDICINES (name, category, barcode, description)
            VALUES 
                ('Paracetamol 500mg', 'Pain Relief', 'PAR500', 'Paracetamol 500mg tablet'),
                ('Amoxicillin 250mg', 'Antibiotic', 'AMO250', 'Amoxicillin 250mg capsule'),
                ('Cough Syrup', 'Cough & Cold', 'COUGH', 'Cough syrup 100ml'),
                ('Vitamin C 1000mg', 'Vitamins', 'VITC1000', 'Vitamin C 1000mg tablet'),
                ('Ibuprofen 400mg', 'Pain Relief', 'IBU400', 'Ibuprofen 400mg tablet'),
                ('Cetirizine 10mg', 'Allergy', 'CET10', 'Cetirizine 10mg tablet'),
                ('ORS Powder', 'Hydration', 'ORS', 'Oral Rehydration Salt powder'),
                ('Glucometer', 'Medical Device', 'GLU', 'Blood glucose monitoring device')
            ON CONFLICT (barcode) DO NOTHING
        `);

        // Get supplier and medicine IDs
        const suppliers = await pool.query('SELECT id FROM SUPPLIERS');
        const medicines = await pool.query('SELECT id, name FROM MEDICINES');

        if (medicines.rows.length === 0) {
            console.log('No medicines found. Please add medicines first.');
            return;
        }

        // Add inventory with stock
        const today = new Date();
        const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
        
        for (const medicine of medicines.rows) {
            // Skip if inventory already exists for this medicine
            const existing = await pool.query('SELECT id FROM INVENTORY WHERE medicine_id = $1', [medicine.id]);
            if (existing.rows.length > 0) continue;

            await pool.query(`
                INSERT INTO INVENTORY (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, tax_percentage)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                medicine.id,
                suppliers.rows[0].id,
                `BATCH-${medicine.id.toString().padStart(3, '0')}`,
                Math.floor(Math.random() * 100) + 50, // Random stock between 50-150
                nextYear,
                parseFloat((Math.random() * 50 + 10).toFixed(2)), // Purchase price 10-60
                parseFloat((Math.random() * 100 + 20).toFixed(2)), // MRP 20-120
                12 // 12% tax
            ]);
        }

        console.log('Sample inventory seeded successfully!');
        
        // Display current inventory
        const inventory = await pool.query(`
            SELECT i.id, i.inventory_id, m.name, i.batch_number, i.stock_qty, i.mrp, i.tax_percentage
            FROM INVENTORY i
            JOIN MEDICINES m ON i.medicine_id = m.id
        `);
        console.log('Current Inventory:');
        console.table(inventory.rows);

    } catch (error) {
        console.error('Error seeding inventory:', error);
    } finally {
        process.exit();
    }
};

seedInventory();

