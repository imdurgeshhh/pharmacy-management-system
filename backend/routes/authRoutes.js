const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register - Create new employee
router.post('/register', authController.register);

// POST /api/auth/login - Employee login
router.post('/login', authController.login);

// GET /api/auth/employees - Admin only list employees
router.get('/employees', authController.getEmployees);

module.exports = router;

