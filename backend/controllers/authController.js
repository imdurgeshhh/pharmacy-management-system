const { pool } = require('../config/db');
const crypto = require('crypto');

const getEmployeeColumns = async () => {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
  `);

  return new Set(result.rows.map((row) => row.column_name));
};

// Register new employee
exports.register = async (req, res) => {
  console.log('=== /api/auth/register HIT ===');
  console.log('Body:', req.body);
  
  const { full_name, email, username, password, confirm_password, role } = req.body;
  
  try {
    const employeeColumns = await getEmployeeColumns();
    const nameColumn = employeeColumns.has('full_name') ? 'full_name' : 'name';
    const hasEmailColumn = employeeColumns.has('email');

    // Validation
    if (!full_name || !email || !username || !password || !confirm_password || !role) {
      return res.status(400).json({ error: 'All fields required: full_name, email, username, password, confirm_password, role' });
    }
    
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    
    const normalizedRole = role.toLowerCase();
    if (!['admin', 'shopkeeper'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Role must be "admin" or "shopkeeper"' });
    }
    
    // Check duplicates
    const duplicateParams = [username];
    const duplicateConditions = ['username = $1'];

    if (hasEmailColumn) {
      duplicateParams.push(email);
      duplicateConditions.push(`email = $${duplicateParams.length}`);
    }

    const existing = await pool.query(
      `SELECT id FROM EMPLOYEES WHERE ${duplicateConditions.join(' OR ')}`,
      duplicateParams
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: hasEmailColumn ? 'Username or email already exists' : 'Username already exists' });
    }
    
    const insertColumns = [nameColumn, 'username', 'password', 'role'];
    const insertValues = [full_name, username, password, normalizedRole];

    if (hasEmailColumn) {
      insertColumns.splice(1, 0, 'email');
      insertValues.splice(1, 0, email);
    }

    const returningColumns = ['id', nameColumn, 'username', 'role'];
    if (hasEmailColumn) {
      returningColumns.splice(2, 0, 'email');
    }

    const placeholders = insertValues.map((_, index) => `$${index + 1}`);
    const result = await pool.query(
      `
        INSERT INTO EMPLOYEES (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING ${returningColumns.join(', ')}
      `,
      insertValues
    );
    
    const user = result.rows[0];
    const token = crypto.createHash('sha256').update(`${user.id}-${Date.now()}`).digest('base64').substring(0, 32);
    
    console.log('SUCCESS - Created user:', user.username);
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.full_name || user.name,
        email: user.email || email,
        username: user.username,
        role: user.role,
        token
      }
    });
    
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

// Login
exports.login = async (req, res) => {
  console.log('=== /api/auth/login HIT ===');
  
  const { username, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT id, full_name, username, password, role, email, employee_id, admin_id, is_active FROM employees WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block inactive employees
    if (user.role === 'employee' && user.is_active === false) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact your administrator.' });
    }
    
    const token = crypto.createHash('sha256').update(`${user.id}-${Date.now()}`).digest('base64').substring(0, 32);
    
    console.log('LOGIN SUCCESS:', user.username, '| Role:', user.role);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.full_name || user.name,
        email: user.email || null,
        username: user.username,
        role: user.role,
        employee_id: user.employee_id || null,
        admin_id: user.admin_id || null,
        token
      }
    });
    
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get employees (admin only)
exports.getEmployees = async (req, res) => {
  try {
    const employeeColumns = await getEmployeeColumns();
    const selectColumns = ['id'];

    if (employeeColumns.has('full_name')) {
      selectColumns.push('full_name AS name');
    } else if (employeeColumns.has('name')) {
      selectColumns.push('name');
    }

    selectColumns.push('username', 'role');

    if (employeeColumns.has('email')) {
      selectColumns.push('email');
    }

    if (employeeColumns.has('created_at')) {
      selectColumns.push('created_at');
    }

    const result = await pool.query(`SELECT ${selectColumns.join(', ')} FROM EMPLOYEES ORDER BY id DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

