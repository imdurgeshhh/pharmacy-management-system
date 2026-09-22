const express = require('express');
const router = express.Router();
const wholesaleController = require('../controllers/wholesaleController');
const { authenticateToken } = require('../middleware/auth');
const { adminOnly, requireBusinessAccess } = require('../middleware/roleCheck');

// All wholesale routes require valid auth and assigned business
router.use(authenticateToken, requireBusinessAccess);

// Wholesale Sales (medicines sold to other shopkeepers)
router.get('/sales', wholesaleController.getWholesaleSales);
router.post('/sales', wholesaleController.addWholesaleSale);
router.delete('/sales/:id', adminOnly, wholesaleController.deleteWholesaleSale);

// Wholesale Purchases (medicines bought from suppliers)
router.get('/purchases', wholesaleController.getWholesalePurchases);
router.post('/purchases', wholesaleController.addWholesalePurchase);
router.delete('/purchases/:id', adminOnly, wholesaleController.deleteWholesalePurchase);

module.exports = router;
