'use strict';

/**
 * Global centralized error handler for Express.
 * Catches all unhandled synchronous and asynchronous pipeline errors.
 * Ensures clients NEVER receive stack traces, SQL queries, or internal file paths.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Log full error details server-side for debugging
  console.error('[SERVER ERROR]', {
    method: req.method,
    url: req.originalUrl,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack
  });

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File size exceeds maximum allowed limit of 5MB'
      });
    }
    return res.status(400).json({
      error: `File upload error: ${err.message}`
    });
  }

  // Handle malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON request body'
    });
  }

  // Handle explicit status errors (e.g., from custom errors)
  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600
    ? err.status
    : (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500);

  // For 4xx client errors, safe error message can be returned
  if (statusCode < 500) {
    return res.status(statusCode).json({
      error: err.message || 'Bad Request'
    });
  }

  // For 500 Internal Server Errors, return generic safe message
  return res.status(500).json({
    error: 'Internal server error'
  });
}

module.exports = errorHandler;
