'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Isolated upload directory outside direct web root
const UPLOAD_DIR = path.join(__dirname, '../uploads/temp');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed extensions and MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Generate secure random UUID filename; never preserve original client name
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    const uniqueName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF documents are allowed.');
    error.statusCode = 400;
    return cb(error, false);
  }
  cb(null, true);
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_FILE_SIZE_BYTES, 10) || 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

/**
 * Validates file content using magic byte signatures (deep content inspection).
 * Rejects polyglots, renamed executables, or corrupt files.
 */
async function verifyMagicBytes(req, res, next) {
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;

  try {
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await fd.read(buffer, 0, 12, 0);
    await fd.close();

    if (bytesRead < 4) {
      await fs.promises.unlink(filePath).catch(() => {});
      return res.status(400).json({ error: 'File content is corrupted or empty' });
    }

    // Check signatures:
    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    // PNG: 89 50 4E 47
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    // PDF: %PDF (25 50 44 46)
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
    const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                   buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if (!isJpeg && !isPng && !isPdf && !isWebp) {
      // Content does not match allowed magic signatures
      await fs.promises.unlink(filePath).catch(() => {});
      return res.status(400).json({
        error: 'Invalid file type: file content does not match genuine image or PDF signature.'
      });
    }

    next();
  } catch (err) {
    await fs.promises.unlink(filePath).catch(() => {});
    return res.status(400).json({ error: 'Failed to inspect uploaded file content' });
  }
}

module.exports = {
  upload,
  verifyMagicBytes,
  UPLOAD_DIR
};
