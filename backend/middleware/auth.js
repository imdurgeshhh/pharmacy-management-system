/**
 * auth.js — Clerk-based authentication and identity loading middleware
 *
 * Uses @clerk/express getAuth(req) to verify the Clerk session token.
 * Populates:
 *   - req.auth: Clerk auth object (userId, sessionId, sessionClaims)
 *   - req.user: Local DB employee profile (id, name, email, role, admin_id, is_active)
 *   - req.role: Normalized role string ('admin', 'shopkeeper', 'employee')
 *   - req.adminId: Integer ID of the owning Admin tenant (for data isolation)
 *
 * Unauthenticated requests receive 401 Unauthorized.
 * Deactivated accounts receive 403 Forbidden.
 */
const { getAuth } = require('@clerk/express');
const { pool } = require('../config/db');

async function loadDbUser(req) {
  if (req.user) return req.user;

  const auth = req.auth || getAuth(req);
  if (!auth?.userId) return null;

  try {
    // 1. Primary lookup: by clerk_user_id
    const clerkResult = await pool.query(
      `SELECT id, name, full_name, email, username, role, admin_id, is_active, clerk_user_id
       FROM employees 
       WHERE clerk_user_id = $1 
       LIMIT 1`,
      [auth.userId]
    );

    if (clerkResult.rows.length > 0) {
      return clerkResult.rows[0];
    }

    // 2. Secondary lookup: by email from sessionClaims
    let email = auth.sessionClaims?.email;

    // 3. Fallback: fetch from clerkClient if not present in sessionClaims
    if (!email && auth.userId) {
      try {
        const { clerkClient } = require('@clerk/express');
        if (clerkClient?.users) {
          const clerkUser = await clerkClient.users.getUser(auth.userId);
          email = clerkUser?.emailAddresses?.[0]?.emailAddress;
        }
      } catch (_) {}
    }

    if (email) {
      const emailResult = await pool.query(
        `SELECT id, name, full_name, email, username, role, admin_id, is_active, clerk_user_id
         FROM employees 
         WHERE LOWER(email) = LOWER($1) 
         LIMIT 1`,
        [email]
      );

      if (emailResult.rows.length > 0) {
        const user = emailResult.rows[0];
        // Backfill clerk_user_id for future fast lookups
        if (!user.clerk_user_id) {
          try {
            await pool.query(
              `UPDATE employees SET clerk_user_id = $1 WHERE id = $2`,
              [auth.userId, user.id]
            );
            user.clerk_user_id = auth.userId;
          } catch (_) {}
        }
        return user;
      }

      // 4. Auto-provision self-registering Admin via Clerk (Requirement 3)
      try {
        const username = email.split('@')[0] + '_' + Math.random().toString(36).slice(2, 6);
        const newAdminRes = await pool.query(
          `INSERT INTO employees (name, full_name, email, username, password, role, auth_provider, clerk_user_id, is_active)
           VALUES ($1, $1, $2, $3, NULL, 'admin', 'clerk', $4, TRUE)
           RETURNING id, name, full_name, email, username, role, admin_id, is_active, clerk_user_id`,
          [email.split('@')[0], email, username, auth.userId]
        );
        return newAdminRes.rows[0];
      } catch (insertErr) {
        console.error('auth.js: auto-provision admin error:', insertErr.message);
      }
    }

    return null;
  } catch (err) {
    console.error('auth.js: loadDbUser failed:', err.message);
    return null;
  }
}

const authenticateToken = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    req.auth = auth;

    const user = await loadDbUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User profile not found' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Forbidden: Account is deactivated' });
    }

    req.user = user;
    req.role = user.role ? user.role.toLowerCase() : 'guest';
    req._dbRole = req.role;

    // Derive tenant ownership: Admin owns their own id unless explicitly assigned to another admin tenant; Shopkeeper/Employee belongs to admin_id
    if (req.role === 'admin') {
      req.adminId = user.admin_id ? Number(user.admin_id) : user.id;
    } else {
      req.adminId = user.admin_id ? Number(user.admin_id) : null;
    }

    next();
  } catch (err) {
    console.error('authenticateToken error:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
  }
};

module.exports = { authenticateToken, loadDbUser };
