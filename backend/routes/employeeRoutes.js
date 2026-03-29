const express = require('express');
const router = express.Router();
const empController = require('../controllers/employeeController');

// POST   /api/employees          — Create employee (admin only)
router.post('/', empController.createEmployee);

// GET    /api/employees           — List employees (optionally filter by admin_id)
router.get('/', empController.getEmployees);

// PUT    /api/employees/:id       — Update employee details
router.put('/:id', empController.updateEmployee);

// DELETE /api/employees/:id       — Delete employee (admin only)
router.delete('/:id', empController.deleteEmployee);

// PATCH  /api/employees/:id/toggle — Toggle active status
router.patch('/:id/toggle', empController.toggleActive);

module.exports = router;
