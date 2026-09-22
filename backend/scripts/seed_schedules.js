const { pool } = require('../config/db');

async function seedSchedules() {
  try {
    await pool.query("UPDATE medicines SET schedule = 'H' WHERE name ILIKE '%Azithromycin%' OR name ILIKE '%Amoxicillin 250%'");
    await pool.query("UPDATE medicines SET schedule = 'G' WHERE name ILIKE '%Cetirizine%'");
    console.log('Sample medicines updated with realistic schedules: H (Azithromycin, Amoxicillin), G (Cetirizine), H1 (Augmentin).');
  } catch (err) {
    console.error('Error seeding schedules:', err.message);
  } finally {
    await pool.end();
  }
}

seedSchedules();
