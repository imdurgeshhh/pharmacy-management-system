'use strict';

const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly, requireBusinessAccess } = require('../middleware/roleCheck');
const { saleSchema, positiveIntId, validate } = require('../middleware/validate');

// All sales routes require authentication and tenant business access
router.use(authenticateToken, requireBusinessAccess);

// Specific sub-routes first to avoid :id param collision
router.get('/invoice/:saleId', validate([positiveIntId('saleId')]), saleController.generateInvoicePDF);
router.post('/invoice/preview', saleController.previewInvoicePDF);

router.get('/', saleController.getSales);
router.get('/:id', validate([positiveIntId('id')]), saleController.getSaleById);
router.post('/', saleSchema, saleController.createSale);
router.put('/:id', validate([positiveIntId('id')]), saleController.updateSale);
router.delete('/:id', adminOnly, validate([positiveIntId('id')]), saleController.deleteSale);

module.exports = router;
