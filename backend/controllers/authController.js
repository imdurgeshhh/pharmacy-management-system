const { pool } = require('../config/db');

// Get employees (used by admin dashboard) — strictly isolated to authenticated Admin
exports.getEmployees = async (req, res) => {
  try {
    const adminId = req.user?.id || req.adminId;
    const result = await pool.query(
      `
        SELECT id, COALESCE(full_name, name) AS name, username, role, email, employee_id, admin_id, is_active, created_at
        FROM employees
        WHERE admin_id = $1
        ORDER BY id DESC
      `,
      [adminId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET EMPLOYEES ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// ---------------------------------------------------------------------------
// Clerk Sync endpoint
// Called by ClerkAuthSync in App.jsx after Clerk sign-in to provision/look up
// the user in the local employees table and return their DB role.
// ---------------------------------------------------------------------------
exports.clerkSync = async (req, res) => {
  const { email, full_name, username, clerk_id } = req.body;

  if (!email || !username) {
    return res.status(400).json({ error: 'email and username are required for Clerk sync' });
  }

  try {
    const clerkUserId = clerk_id || req.auth?.userId || null;

    // Check if user already exists by clerk_user_id, email, or username
    const existingUser = await pool.query(
      `
        SELECT id, COALESCE(full_name, name) AS name, username, role, email, employee_id, admin_id, auth_provider, clerk_user_id
        FROM employees
        WHERE (clerk_user_id = $1 AND $1 IS NOT NULL)
           OR LOWER(email) = LOWER($2) 
           OR username = $3
        LIMIT 1
      `,
      [clerkUserId, email, username]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      // Link clerk_user_id and update email if missing
      if (!user.clerk_user_id && clerkUserId) {
        try {
          await pool.query(
            `UPDATE employees 
             SET clerk_user_id = $1, email = COALESCE(email, $2)
             WHERE id = $3`,
            [clerkUserId, email, user.id]
          );
          user.clerk_user_id = clerkUserId;
        } catch (_) {}
      }

      return res.json({
        message: 'Sync successful (existing user)',
        user: {
          id: user.id,
          name: user.name,
          email: user.email || email,
          username: user.username,
          role: user.role,
          employee_id: user.employee_id || null,
          admin_id: user.admin_id || null,
        }
      });
    }

    // User does not exist — self-registering Admin via Clerk signup (Requirement 3)
    const displayName = full_name || username;
    const result = await pool.query(
      `
        INSERT INTO employees (name, full_name, email, username, password, role, auth_provider, clerk_user_id, is_active)
        VALUES ($1, $1, $2, $3, NULL, 'admin', 'clerk', $4, TRUE)
        RETURNING id, COALESCE(full_name, name) AS name, username, role, email, employee_id, admin_id
      `,
      [displayName, email, username, clerkUserId]
    );
    const newUser = result.rows[0];

    res.status(201).json({
      message: 'Sync successful (new admin created)',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email || email,
        username: newUser.username,
        role: newUser.role,
        employee_id: null,
        admin_id: null,
      }
    });

  } catch (error) {
    console.error('CLERK SYNC ERROR:', error);
    res.status(500).json({ error: 'Clerk sync failed' });
  }
};
