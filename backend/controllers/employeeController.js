const { pool } = require('../config/db');

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

// POST /api/employees  — Admin creates a new employee
exports.createEmployee = async (req, res) => {
  const {
    full_name, qualification, address, mobile_no, email,
    aadhar_number, password, confirm_password, admin_id
  } = req.body;

  // Accept either full_name or name from body
  const name = full_name || req.body.name;

  if (!name || !email || !password || !confirm_password) {
    return res.status(400).json({ error: 'Full name, email, password, and confirm password are required' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    // Check duplicate email
    const dup = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: 'An employee with this email already exists' });
    }

    const employee_id = await generateEmployeeId();
    const username = employee_id;

    const result = await pool.query(
      `INSERT INTO employees
        (name, email, username, password, role, employee_id, qualification, address, mobile_no, aadhar_number, admin_id, is_active, created_at)
       VALUES ($1, $2, $3, $4, 'employee', $5, $6, $7, $8, $9, $10, TRUE, NOW())
       RETURNING id, name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, admin_id, is_active, created_at`,
      [name, email, username, password, employee_id, qualification, address, mobile_no, aadhar_number, admin_id]
    );

    // Return full_name alias so frontend stays consistent
    const emp = result.rows[0];
    res.status(201).json({ message: 'Employee created successfully', employee: { ...emp, full_name: emp.name } });
  } catch (err) {
    console.error('CREATE EMPLOYEE ERROR:', err);
    res.status(500).json({ error: 'Failed to create employee: ' + err.message });
  }
};

// GET /api/employees?admin_id=X
exports.getEmployees = async (req, res) => {
  const { admin_id } = req.query;
  try {
    const query = admin_id
      ? `SELECT id, name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, is_active, created_at
         FROM employees WHERE admin_id = $1 AND role = 'employee' ORDER BY created_at DESC`
      : `SELECT id, name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, is_active, created_at
         FROM employees WHERE role = 'employee' ORDER BY created_at DESC`;

    const params = admin_id ? [admin_id] : [];
    const result = await pool.query(query, params);

    // Map name → full_name for frontend consistency
    const rows = result.rows.map(r => ({ ...r, full_name: r.name }));
    res.json(rows);
  } catch (err) {
    console.error('GET EMPLOYEES ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { full_name, qualification, address, mobile_no, email, aadhar_number } = req.body;
  const name = full_name || req.body.name;
  try {
    const result = await pool.query(
      `UPDATE employees SET
        name = COALESCE($1, name),
        qualification = COALESCE($2, qualification),
        address = COALESCE($3, address),
        mobile_no = COALESCE($4, mobile_no),
        email = COALESCE($5, email),
        aadhar_number = COALESCE($6, aadhar_number)
       WHERE id = $7 AND role = 'employee'
       RETURNING id, name, email, username, role, employee_id, qualification, address, mobile_no, aadhar_number, is_active`,
      [name, qualification, address, mobile_no, email, aadhar_number, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const emp = result.rows[0];
    res.json({ message: 'Employee updated', employee: { ...emp, full_name: emp.name } });
  } catch (err) {
    console.error('UPDATE EMPLOYEE ERROR:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM employees WHERE id = $1 AND role = 'employee' RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error('DELETE EMPLOYEE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

// PATCH /api/employees/:id/toggle
exports.toggleActive = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE employees SET is_active = NOT is_active
       WHERE id = $1 AND role = 'employee'
       RETURNING id, is_active, name`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const emp = result.rows[0];
    res.json({ message: 'Status toggled', employee: { ...emp, full_name: emp.name } });
  } catch (err) {
    console.error('TOGGLE ERROR:', err);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
};
