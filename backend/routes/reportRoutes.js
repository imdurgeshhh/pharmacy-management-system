const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly, requireBusinessAccess } = require('../middleware/roleCheck');

// Reports are strictly restricted to Admins with business access
router.use(authenticateToken, adminOnly, requireBusinessAccess);

router.get('/dashboard', reportController.getDashboardStats);
router.get('/sales', reportController.getSalesReport);

module.exports = router;
