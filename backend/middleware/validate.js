'use strict';

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware factory to run an array of express-validator chains
 * and reject immediately with 400 Bad Request if validation fails.
 */
function validate(validations) {
  return async (req, res, next) => {
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const firstError = errors.array()[0];
    return res.status(400).json({
      error: firstError.msg,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg
      }))
    });
  };
}

// ── Common Validators ────────────────────────────────────────────────────────
const positiveIntId = (paramName = 'id') =>
  param(paramName)
    .trim()
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`);

// ── Auth Schemas ─────────────────────────────────────────────────────────────
const clerkSyncSchema = validate([
  body('email')
    .trim()
    .notEmpty().withMessage('email is required')
    .isEmail().withMessage('Must be a valid email address')
    .isLength({ max: 150 }).withMessage('Email cannot exceed 150 characters'),
  body('username')
    .trim()
    .notEmpty().withMessage('username is required')
    .isLength({ min: 2, max: 50 }).withMessage('Username must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_\-\.]+$/).withMessage('Username can only contain letters, numbers, dots, dashes, and underscores'),
  body('full_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Full name cannot exceed 150 characters'),
  body('clerk_id')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('clerk_id cannot exceed 150 characters')
]);

// ── Employee Schemas ─────────────────────────────────────────────────────────
const createShopkeeperSchema = validate([
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('full_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Full name cannot exceed 150 characters'),
  body('mobile_no')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{10}$/).withMessage('Mobile number must be a valid 10-digit number'),
  body('qualification')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Qualification cannot exceed 150 characters'),
  body('address')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),
  body('aadhar_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{12}$/).withMessage('Aadhar number must be a valid 12-digit number')
]);

const createEmployeeSchema = validate([
  body('name')
    .custom((val, { req }) => {
      const name = req.body.full_name || req.body.name;
      if (!name || !name.trim()) throw new Error('Full name is required');
      return true;
    }),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('confirm_password')
    .notEmpty().withMessage('Confirm password is required')
    .custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  body('mobile_no')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{10}$/).withMessage('Mobile number must be a valid 10-digit number'),
  body('aadhar_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{12}$/).withMessage('Aadhar number must be a valid 12-digit number')
]);

// ── Customer Schemas ─────────────────────────────────────────────────────────
const customerSchema = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Customer name must be between 2 and 150 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\d{10}$/).withMessage('Phone number must be a valid 10-digit number'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Must be a valid email address'),
  body('gstin')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Must be a valid 15-character GSTIN format'),
  body('address')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters')
]);

// ── Inventory Schemas ────────────────────────────────────────────────────────
const VALID_SCHEDULES = ['NONE', 'G', 'H', 'H1', 'X'];

const medicineSchema = validate([
  body('name')
    .custom((val, { req }) => {
      const medName = req.body.medicine_name || req.body.name;
      if (!medName || !medName.trim()) throw new Error('Medicine name is required');
      if (medName.trim().length < 2 || medName.trim().length > 255) {
        throw new Error('Medicine name must be between 2 and 255 characters');
      }
      return true;
    }),
  body('brand_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Brand name cannot exceed 255 characters'),
  body('schedule')
    .optional({ nullable: true })
    .trim()
    .toUpperCase()
    .custom((val) => {
      if (val && !VALID_SCHEDULES.includes(val)) {
        throw new Error(`Invalid schedule: '${val}'. Allowed values: ${VALID_SCHEDULES.join(', ')}`);
      }
      return true;
    }),
  body('hsn_code')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 }).withMessage('HSN code cannot exceed 20 characters'),
  body('pack_size')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Pack size cannot exceed 50 characters'),
  body('barcode')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Barcode cannot exceed 100 characters'),
  body('units_per_strip')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('units_per_strip must be an integer >= 1'),
  body('selling_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Selling price must be a number >= 0')
]);

// ── Supplier Schemas ─────────────────────────────────────────────────────────
const supplierSchema = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('Supplier name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Supplier name must be between 2 and 255 characters'),
  body('phone')
    .custom((val, { req }) => {
      const phone = req.body.phone || req.body.contact_number;
      if (!phone || !phone.trim()) throw new Error('Contact number is required');
      if (!/^[\d\s\-\+\(\)]{7,20}$/.test(phone.trim())) throw new Error('Phone number must be a valid phone number');
      return true;
    }),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Must be a valid email address'),
  body('gstin')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Must be a valid 15-character GSTIN format'),
  body('dl_number')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('DL number cannot exceed 100 characters')
]);

// ── Store Settings Schema ───────────────────────────────────────────────────
const storeSettingsSchema = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('Store name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Store name must be between 2 and 150 characters'),
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 5, max: 500 }).withMessage('Address must be between 5 and 500 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\d{10}$/).withMessage('Phone number must be a valid 10-digit number'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Must be a valid email address'),
  body('dl_no')
    .trim()
    .notEmpty().withMessage('Drug licence number is required')
    .isLength({ max: 100 }).withMessage('Drug licence number cannot exceed 100 characters'),
  body('gstin')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('GSTIN must follow the valid 15-character GSTIN format')
]);

// ── Sale Schema ─────────────────────────────────────────────────────────────
const saleSchema = validate([
  body('items')
    .isArray({ min: 1 }).withMessage('Sale must contain at least one item'),
  body('items.*')
    .custom((item) => {
      const strips = item.strips !== undefined ? item.strips : item.strips_qty;
      const loose = item.loose !== undefined ? item.loose : item.loose_qty;
      const q = item.qty !== undefined ? item.qty : item.quantity;
      if (strips !== undefined || loose !== undefined) {
        const s = strips !== undefined ? parseFloat(strips) : 0;
        const l = loose !== undefined ? parseFloat(loose) : 0;
        if (isNaN(s) || isNaN(l) || s < 0 || l < 0) {
          throw new Error('Strips and loose quantities must be non-negative numbers');
        }
        if (s === 0 && l === 0 && (q === undefined || parseFloat(q) <= 0)) {
          throw new Error('Item quantity must be greater than 0');
        }
      } else {
        const parsedQ = parseFloat(q);
        if (isNaN(parsedQ) || parsedQ <= 0) {
          throw new Error('Item quantity must be greater than 0');
        }
      }
      return true;
    }),
  body('payment_mode')
    .optional({ nullable: true })
    .trim()
    .custom((val) => {
      const valid = ['cash', 'card', 'upi', 'credit', 'online'];
      if (!valid.includes(val.toLowerCase())) {
        throw new Error('Payment mode must be Cash, Card, UPI, Credit, or Online');
      }
      return true;
    })
]);

// ── Purchase Schema ─────────────────────────────────────────────────────────
const purchaseSchema = validate([
  body('items')
    .isArray({ min: 1 }).withMessage('No items provided'),
  body('items.*')
    .custom((item) => {
      const strips = item.strips !== undefined ? item.strips : item.strips_qty;
      const loose = item.loose !== undefined ? item.loose : item.loose_qty;
      const q = item.qty !== undefined ? item.qty : item.quantity;
      if (strips !== undefined || loose !== undefined) {
        const s = strips !== undefined ? parseFloat(strips) : 0;
        const l = loose !== undefined ? parseFloat(loose) : 0;
        if (isNaN(s) || isNaN(l) || s < 0 || l < 0) {
          throw new Error('Strips and loose quantities must be non-negative numbers');
        }
        if (s === 0 && l === 0 && (q === undefined || parseFloat(q) <= 0)) {
          throw new Error('Item quantity must be greater than 0');
        }
      } else if (q !== undefined) {
        const parsedQ = parseFloat(q);
        if (isNaN(parsedQ) || parsedQ <= 0) {
          throw new Error('Item quantity must be greater than 0');
        }
      }
      const rawSP = item.selling_price !== undefined ? item.selling_price : item.mrp;
      if (rawSP !== undefined && rawSP !== null && rawSP !== '') {
        const sp = parseFloat(rawSP);
        if (isNaN(sp) || sp < 0) {
          throw new Error('Selling price must be a valid number >= 0');
        }
      }
      return true;
    })
]);

module.exports = {
  validate,
  positiveIntId,
  clerkSyncSchema,
  createShopkeeperSchema,
  createEmployeeSchema,
  customerSchema,
  medicineSchema,
  supplierSchema,
  storeSettingsSchema,
  saleSchema,
  purchaseSchema
};
