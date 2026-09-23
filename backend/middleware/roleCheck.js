/**
 * roleCheck.js — Role-Based Access Control and Tenant Access Middleware
 */
const { loadDbUser } = require('./auth');

/**
 * Helper to get user's role from request or database.
 */
async function getDbRole(req) {
  if (req.role) return req.role;
  if (req._dbRole) return req._dbRole;
  
  const user = await loadDbUser(req);
  if (!user) return null;

  req.user = user;
  req.role = user.role ? user.role.toLowerCase() : 'guest';
  req.adminId = req.role === 'admin' 
    ? (user.admin_id ? Number(user.admin_id) : user.id) 
    : (user.admin_id ? Number(user.admin_id) : null);

  return req.role;
}

/**
 * adminOnly — restrict access strictly to Admin users.
 * Shopkeepers and Employees receive 403 Forbidden.
 */
const adminOnly = async (req, res, next) => {
  const role = req.role || await getDbRole(req);
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }
  next();
};

/**
 * requireRole(...roles) — allow only users with one of the specified roles.
 */
const requireRole = (...allowedRoles) => {
  const normalized = allowedRoles.map(r => r.toLowerCase());
  return async (req, res, next) => {
    const role = req.role || await getDbRole(req);
    if (!role || !normalized.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
};

/**
 * requireBusinessAccess — enforce that any user accessing tenant data
 * must belong to a valid Admin tenant (req.adminId must not be null).
 *
 * An unassigned shopkeeper (admin_id is null) is blocked from all business data.
 */
const requireBusinessAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      await getDbRole(req);
    }

    if (!req.adminId) {
      return res.status(403).json({ error: 'Forbidden: Unassigned shopkeeper has no business access' });
    }

    next();
  } catch (err) {
    console.error('requireBusinessAccess error:', err.message);
    return res.status(403).json({ error: 'Forbidden: Business access check failed' });
  }
};

module.exports = {
  adminOnly,
  requireRole,
  requireBusinessAccess,
  getDbRole,
};
