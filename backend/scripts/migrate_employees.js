const { pool } = require('../config/db');

/*
  Employee table setup — safe to run multiple times (uses IF NOT EXISTS / IF EXISTS checks)

  Form fields → DB columns:
  ┌────────────────────┬─────────────────────────────────────┐
  │ Form Field         │ DB Column                           │
  ├────────────────────┼─────────────────────────────────────┤
  │ Full Name          │ name          VARCHAR(255)          │
  │ User ID (auto)     │ employee_id   VARCHAR(20) UNIQUE    │
  │                    │ username      VARCHAR(100) UNIQUE   │
  │ Qualification      │ qualification TEXT                  │
  │ Address            │ address       TEXT                  │
  │ Mobile Number      │ mobile_no     VARCHAR(20)           │
  │ Email              │ email         VARCHAR(255) UNIQUE   │
  │ Aadhar Number      │ aadhar_number VARCHAR(20)           │
  │ Password           │ password      VARCHAR(255)          │
  │ Role               │ role          VARCHAR(20) = employee│
  │ Admin link         │ admin_id      INTEGER               │
  │ Active status      │ is_active     BOOLEAN DEFAULT TRUE  │
  │ Created at         │ created_at    TIMESTAMPTZ           │
  └────────────────────┴─────────────────────────────────────┘
*/

async function migrate() {
  try {
    console.log('Running employees table migration...');

    // 1. Add all missing columns safely
    await pool.query(`
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS employee_id   VARCHAR(20)  UNIQUE,
        ADD COLUMN IF NOT EXISTS email         VARCHAR(255),
        ADD COLUMN IF NOT EXISTS qualification TEXT,
        ADD COLUMN IF NOT EXISTS address       TEXT,
        ADD COLUMN IF NOT EXISTS mobile_no     VARCHAR(20),
        ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS admin_id      INTEGER,
        ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS role          VARCHAR(20) DEFAULT 'employee';
    `);
    console.log('✅ Step 1: Columns added');

    // 2. Fix created_at type (old schema used TIMESTAMP WITHOUT TIME ZONE — upgrade to TIMESTAMPTZ)
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'employees'
          AND column_name = 'created_at'
          AND data_type = 'timestamp without time zone'
        ) THEN
          ALTER TABLE employees
            ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
        END IF;
      END
      $$;
    `);
    console.log('✅ Step 2: created_at type fixed');

    // 3. Set defaults for existing rows
    await pool.query(`
      UPDATE employees SET is_active = TRUE WHERE is_active IS NULL;
      UPDATE employees SET role = 'employee' WHERE role IS NULL;
    `);
    console.log('✅ Step 3: Default values set for existing rows');

    // 4. Ensure name column is wide enough
    await pool.query(`
      ALTER TABLE employees
        ALTER COLUMN name TYPE VARCHAR(255);
    `);
    console.log('✅ Step 4: name column size ensured');

    console.log('\n✅ Migration complete — employees table is ready.\n');

    // 5. Print final schema
    const cols = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employees'
      ORDER BY ordinal_position
    `);
    console.log('Final employees table schema:');
    cols.rows.forEach(c =>
      console.log(`  ${c.column_name.padEnd(18)} ${c.data_type.padEnd(30)} nullable=${c.is_nullable}`)
    );

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
