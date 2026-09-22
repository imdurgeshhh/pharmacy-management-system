'use strict';

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly, requireBusinessAccess } = require('../middleware/roleCheck');
const { customerSchema, positiveIntId, validate } = require('../middleware/validate');

// All customer routes require authentication and tenant business access
router.use(authenticateToken, requireBusinessAccess);

router.get('/', customerController.getCustomers);
router.get('/:id', validate([positiveIntId('id')]), customerController.getCustomerById);
router.post('/', customerSchema, customerController.addCustomer);
router.put('/:id', validate([positiveIntId('id')]), customerSchema, customerController.updateCustomer);
router.delete('/:id', adminOnly, validate([positiveIntId('id')]), customerController.deleteCustomer);

module.exports = router;
