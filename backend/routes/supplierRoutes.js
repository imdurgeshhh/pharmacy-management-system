'use strict';

const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly, requireBusinessAccess } = require('../middleware/roleCheck');
const { supplierSchema, positiveIntId, validate } = require('../middleware/validate');

// All supplier routes require authentication and tenant business access
router.use(authenticateToken, requireBusinessAccess);

router.get('/', supplierController.getSuppliers);
router.get('/:id', validate([positiveIntId('id')]), supplierController.getSupplierById);
router.post('/', supplierSchema, supplierController.addSupplier);
router.put('/:id', validate([positiveIntId('id')]), supplierSchema, supplierController.updateSupplier);
router.delete('/:id', adminOnly, validate([positiveIntId('id')]), supplierController.deleteSupplier);

module.exports = router;
