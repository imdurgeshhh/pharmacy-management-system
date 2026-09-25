'use strict';

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly, requireBusinessAccess } = require('../middleware/roleCheck');
const { medicineSchema, positiveIntId, validate } = require('../middleware/validate');

const VALID_SCHEDULES = ['NONE', 'G', 'H', 'H1', 'X'];

const validateSchedule = (req, res, next) => {
    const { schedule } = req.body;
    if (schedule !== undefined && schedule !== null && schedule !== '') {
        const upper = String(schedule).toUpperCase().trim();
        if (!VALID_SCHEDULES.includes(upper)) {
            return res.status(400).json({
                error: `Invalid schedule: '${schedule}'. Allowed schedules are: ${VALID_SCHEDULES.join(', ')}`
            });
        }
        req.body.schedule = upper;
    }
    next();
};

// All inventory endpoints require authentication and business access
router.use(authenticateToken, requireBusinessAccess);

router.get('/', inventoryController.getInventory);
router.get('/alerts', inventoryController.getAlerts);
router.get('/medicine/:id/batches', validate([positiveIntId('id')]), inventoryController.getMedicineBatches);
router.get('/medicine/:id', validate([positiveIntId('id')]), inventoryController.getMedicineById);
router.post('/medicine', medicineSchema, validateSchedule, inventoryController.addMedicine);
router.post('/', medicineSchema, validateSchedule, inventoryController.addMedicine);
router.put('/medicine/:id', validate([positiveIntId('id')]), validateSchedule, inventoryController.updateMedicine);
router.delete('/medicine/:id', adminOnly, validate([positiveIntId('id')]), inventoryController.deleteMedicine);
router.get('/:id', validate([positiveIntId('id')]), inventoryController.getMedicineById);
router.put('/:id', validate([positiveIntId('id')]), validateSchedule, inventoryController.updateMedicine);
router.delete('/:id', adminOnly, validate([positiveIntId('id')]), inventoryController.deleteMedicine);

module.exports = router;
