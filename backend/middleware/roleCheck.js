/**
 * roleCheck middleware
 * Reads the x-user-role header set by the frontend axios interceptor.
 * If the role is 'employee', block the request with 403.
 * Usage: router.delete('/:id', adminOnly, controller.delete)
 */

const adminOnly = (req, res, next) => {
  const role = (req.headers['x-user-role'] || '').toLowerCase();
  if (role === 'employee') {
    return res.status(403).json({
      error: 'Forbidden: employees are not allowed to perform delete operations.'
    });
  }
  next();
};

module.exports = { adminOnly };
