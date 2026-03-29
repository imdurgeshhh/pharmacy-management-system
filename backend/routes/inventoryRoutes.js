const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getInventory);
router.post('/medicine', inventoryController.addMedicine);
router.put('/medicine/:id', inventoryController.updateMedicine);
router.delete('/medicine/:id', inventoryController.deleteMedicine);
router.get('/medicine/:id/batches', inventoryController.getMedicineBatches);
router.get('/alerts', inventoryController.getAlerts);

module.exports = router;
