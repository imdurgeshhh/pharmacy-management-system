'use strict';

const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly, requireBusinessAccess } = require('../middleware/roleCheck');
const { purchaseSchema, positiveIntId, validate } = require('../middleware/validate');

// All purchase routes require authentication and tenant business access
router.use(authenticateToken, requireBusinessAccess);

router.get('/', purchaseController.getPurchases);
router.get('/:id', validate([positiveIntId('id')]), purchaseController.getPurchaseById);
router.post('/', purchaseSchema, purchaseController.createPurchase);
router.put('/:id', validate([positiveIntId('id')]), purchaseController.updatePurchase);
router.delete('/:id', adminOnly, validate([positiveIntId('id')]), purchaseController.deletePurchase);

module.exports = router;
