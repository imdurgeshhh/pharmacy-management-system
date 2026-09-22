'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { authLimiter } = require('../middleware/rateLimiter');
const { clerkSyncSchema } = require('../middleware/validate');

// GET /api/auth/employees - List employees (admin only)
router.get('/employees', authenticateToken, adminOnly, authController.getEmployees);

// POST /api/auth/clerk-sync - Clerk auth sync endpoint (public — with auth rate limiting and strict schema validation)
router.post('/clerk-sync', authLimiter, clerkSyncSchema, authController.clerkSync);

module.exports = router;
