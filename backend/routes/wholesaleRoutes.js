const express = require('express');
const router = express.Router();
const wholesaleController = require('../controllers/wholesaleController');

// Wholesale Sales (medicines sold to other shopkeepers)
router.get('/sales', wholesaleController.getWholesaleSales);
router.post('/sales', wholesaleController.addWholesaleSale);
router.delete('/sales/:id', wholesaleController.deleteWholesaleSale);

// Wholesale Purchases (medicines bought from suppliers)
router.get('/purchases', wholesaleController.getWholesalePurchases);
router.post('/purchases', wholesaleController.addWholesalePurchase);
router.delete('/purchases/:id', wholesaleController.deleteWholesalePurchase);

module.exports = router;
