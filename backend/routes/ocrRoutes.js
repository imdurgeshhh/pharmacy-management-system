'use strict';

const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const { upload, verifyMagicBytes } = require('../middleware/uploadSafety');
const { authenticateToken } = require('../middleware/auth');
const { requireBusinessAccess } = require('../middleware/roleCheck');

// POST /api/ocr/scan — Secure OCR invoice processing
router.post(
  '/scan',
  authenticateToken,
  requireBusinessAccess,
  upload.single('invoice'),
  verifyMagicBytes,
  ocrController.scanInvoice
);

module.exports = router;
