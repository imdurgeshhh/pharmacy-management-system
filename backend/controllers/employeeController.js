const { pool } = require('../config/db');
const { clerkClient } = require('@clerk/express');

// Generate next EMP-XXXX id
const generateEmployeeId = async () => {
  const result = await pool.query(
    `SELECT employee_id FROM employees WHERE employee_id IS NOT NULL ORDER BY employee_id DESC LIMIT 1`
  );
  if (result.rows.length === 0) return 'EMP-0001';
  const last = result.rows[0].employee_id;
  const num = parseInt(last.split('-')[1], 10) + 1;
  return `EMP-${String(num).padStart(4, '0')}`;
};

// POST /api/employees/shopkeeper — Authenticated Admin registers a Shopkeeper
exports.createShopkeeper = async (req, res) => {
  const { email, password, full_name, mobile_no, address, qualification, aadhar_number } = req.body;
  const adminId = req.user?.id;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and initial password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 1. Check duplicate email in local database
    const dupCheck = await pool.query(
      `SELECT id FROM employees WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // 2. Create Clerk User via Clerk Backend SDK
    let clerkUser;
    try {
      const nameParts = (full_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || normalizedEmail.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || undefined;

      clerkUser = await clerkClient.users.createUser({
        emailAddress: [normalizedEmail],
        password: password,
        firstName: firstName,
        lastName: lastName,
      });
    } catch (clerkErr) {
      console.error('Clerk user creation error:', clerkErr.message);
      console.error('Clerk errors detail:', JSON.stringify(clerkErr.errors ?? clerkErr.clerkError ?? clerkErr, null, 2));
      const errMsg = clerkErr.errors?.[0]?.longMessage || clerkErr.errors?.[0]?.message || clerkErr.message || 'Failed to create user in authentication provider';
      return res.status(400).json({ error: errMsg });
    }

    // 3. Create Shopkeeper profile in application database
    // SECURITY: Password is NEVER stored in database (stored as NULL)
    const displayName = full_name || normalizedEmail.split('@')[0];
    const username = normalizedEmail.split('@')[0] + '_' + Math.random().toString(36).slice(2, 6);
    const employee_id = await generateEmployeeId();

    const insertResult = await pool.query(
      `INSERT INTO employees
        (name, full_name, email, username, password, role, employee_id, qualification, address, mobile_no, aadhar_number, admin_id, is_active, auth_provider, clerk_user_id, created_at)
       VALUES ($1, $1, $2, $3, NULL, 'shopkeeper', $4, $5, $6, $7, $8, $9, TRUE, 'clerk', $10, NOW())
       RETURNING id, name, full_name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, admin_id, is_active, created_at`,
      [
        displayName,
        normalizedEmail,
        username,
        employee_id,
        qualification || null,
        address || null,
        mobile_no || null,
        aadhar_number || null,
        adminId, // Strictly server-enforced ownership
        clerkUser.id
      ]
    );

    const created = insertResult.rows[0];

    // Return profile without exposing any sensitive or credential data
    res.status(201).json({
      message: 'Shopkeeper created successfully',
      shopkeeper: created,
      employee: created
    });

  } catch (err) {
    console.error('CREATE SHOPKEEPER ERROR:', err);
    res.status(500).json({ error: 'Failed to create shopkeeper' });
  }
};

// POST /api/employees — Admin creates a staff employee
exports.createEmployee = async (req, res) => {
  const {
    full_name, qualification, address, mobile_no, email,
    aadhar_number, password, confirm_password
  } = req.body;

  const adminId = req.user?.id;
  const name = full_name || req.body.name;

  if (!name || !email || !password || !confirm_password) {
    return res.status(400).json({ error: 'Full name, email, password, and confirm password are required' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const dup = await pool.query('SELECT id FROM employees WHERE LOWER(email) = $1', [normalizedEmail]);
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: 'An employee with this email already exists' });
    }

    const employee_id = await generateEmployeeId();
    const username = employee_id;

    // Notice admin_id is ALWAYS set to authenticated adminId, client cannot supply another
    const result = await pool.query(
      `INSERT INTO employees
        (name, full_name, email, username, password, role, employee_id, qualification, address, mobile_no, aadhar_number, admin_id, is_active, created_at)
       VALUES ($1, $1, $2, $3, $4, 'employee', $5, $6, $7, $8, $9, $10, TRUE, NOW())
       RETURNING id, name, full_name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, admin_id, is_active, created_at`,
      [name, normalizedEmail, username, password, employee_id, qualification, address, mobile_no, aadhar_number, adminId]
    );

    const emp = result.rows[0];
    res.status(201).json({ message: 'Employee created successfully', employee: emp });
  } catch (err) {
    console.error('CREATE EMPLOYEE ERROR:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

// GET /api/employees — List employees belonging to authenticated Admin
exports.getEmployees = async (req, res) => {
  const adminId = req.user?.id;
  try {
    // Strictly isolate by authenticated Admin's id — ignore client query parameters
    const query = `
      SELECT id, name, full_name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, is_active, admin_id, created_at
      FROM employees 
      WHERE admin_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [adminId]);

    const rows = result.rows.map(r => ({
      ...r,
      full_name: r.full_name || r.name
    }));
    res.json(rows);
  } catch (err) {
    console.error('GET EMPLOYEES ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// PUT /api/employees/:id — Update employee with IDOR protection
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id;
  const { full_name, qualification, address, mobile_no, email, aadhar_number } = req.body;
  const name = full_name || req.body.name;

  try {
    // IDOR protection: only update if belonging to authenticated admin
    const result = await pool.query(
      `UPDATE employees SET
        name = COALESCE($1, name),
        full_name = COALESCE($1, full_name),
        qualification = COALESCE($2, qualification),
        address = COALESCE($3, address),
        mobile_no = COALESCE($4, mobile_no),
        email = COALESCE($5, email),
        aadhar_number = COALESCE($6, aadhar_number)
       WHERE id = $7 AND admin_id = $8
       RETURNING id, name, full_name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, is_active, admin_id`,
      [name, qualification, address, mobile_no, email, aadhar_number, id, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = result.rows[0];
    res.json({ message: 'Employee updated', employee: emp });
  } catch (err) {
    console.error('UPDATE EMPLOYEE ERROR:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

// DELETE /api/employees/:id — Delete employee with IDOR protection
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  try {
    const result = await pool.query(
      `DELETE FROM employees WHERE id = $1 AND admin_id = $2 RETURNING id`,
      [id, adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error('DELETE EMPLOYEE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

// PATCH /api/employees/:id/toggle — Toggle active status with IDOR protection
exports.toggleActive = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  try {
    const result = await pool.query(
      `UPDATE employees SET is_active = NOT is_active
       WHERE id = $1 AND admin_id = $2
       RETURNING id, is_active, name, full_name`,
      [id, adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const emp = result.rows[0];
    res.json({ message: 'Status toggled', employee: { ...emp, full_name: emp.full_name || emp.name } });
  } catch (err) {
    console.error('TOGGLE ERROR:', err);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
};
