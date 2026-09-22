'use strict';

const express = require('express');
const router = express.Router();
const empController = require('../controllers/employeeController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  createShopkeeperSchema,
  createEmployeeSchema,
  positiveIntId,
  validate
} = require('../middleware/validate');

// POST   /api/employees/shopkeeper — Admin registers Shopkeeper in Clerk + DB
router.post(
  '/shopkeeper',
  authenticateToken,
  adminOnly,
  authLimiter,
  createShopkeeperSchema,
  empController.createShopkeeper
);

// POST   /api/employees           — Create staff employee (admin only)
router.post(
  '/',
  authenticateToken,
  adminOnly,
  createEmployeeSchema,
  empController.createEmployee
);

// GET    /api/employees           — List employees belonging to this Admin
router.get('/', authenticateToken, adminOnly, empController.getEmployees);

// PUT    /api/employees/:id       — Update employee details (admin only, IDOR protected)
router.put('/:id', authenticateToken, adminOnly, validate([positiveIntId('id')]), empController.updateEmployee);

// DELETE /api/employees/:id       — Delete employee (admin only, IDOR protected)
router.delete('/:id', authenticateToken, adminOnly, validate([positiveIntId('id')]), empController.deleteEmployee);

// PATCH  /api/employees/:id/toggle — Toggle active status (admin only, IDOR protected)
router.patch('/:id/toggle', authenticateToken, adminOnly, validate([positiveIntId('id')]), empController.toggleActive);
router.patch('/:id/toggle-active', authenticateToken, adminOnly, validate([positiveIntId('id')]), empController.toggleActive);

module.exports = router;
