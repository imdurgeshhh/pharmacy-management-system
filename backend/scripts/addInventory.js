const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool } = require('./config/db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to add sample inventory
app.get('/api/seed-inventory', async (req, res) => {
    try {
        // Check if inventory already exists
        const existingInv = await pool.query('SELECT COUNT(*) FROM INVENTORY');
        if (parseInt(existingInv.rows[0].count) > 0) {
            return res.json({ message: 'Inventory already exists', count: existingInv.rows[0].count });
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
        const suppliers = await pool.query('SELECT id FROM SUPPLIERS LIMIT 1');
        const medicines = await pool.query('SELECT id, name FROM MEDICINES');

        if (medicines.rows.length === 0) {
            return res.status(400).json({ error: 'No medicines found. Please add medicines first.' });
        }

        // Add inventory with stock
        const today = new Date();
        const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
        
        for (const medicine of medicines.rows) {
            await pool.query(`
                INSERT INTO INVENTORY (medicine_id, supplier_id, batch_number, stock_qty, expiry_date, purchase_price, mrp, tax_percentage)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                medicine.id,
                suppliers.rows[0].id,
                `BATCH-${medicine.id.toString().padStart(3, '0')}`,
                Math.floor(Math.random() * 100) + 50,
                nextYear,
                parseFloat((Math.random() * 50 + 10).toFixed(2)),
                parseFloat((Math.random() * 100 + 20).toFixed(2)),
                12
            ]);
        }

        res.json({ message: 'Sample inventory seeded successfully!', count: medicines.rows.length });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Seed server running on port ${PORT}`);
    console.log('Visit http://localhost:5001/api/seed-inventory to add sample inventory');
});

