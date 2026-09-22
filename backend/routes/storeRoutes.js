const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { authenticateToken } = require('../middleware/auth');
const { requireBusinessAccess, adminOnly } = require('../middleware/roleCheck');

router.get('/', authenticateToken, requireBusinessAccess, storeController.getStoreSettings);
router.put('/', authenticateToken, adminOnly, storeController.updateStoreSettings);

module.exports = router;

