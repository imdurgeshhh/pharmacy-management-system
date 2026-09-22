'use strict';

const { rateLimit } = require('express-rate-limit');

/**
 * Normalizes client IP address, respecting X-Forwarded-For if behind a proxy
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * In-memory tracker for exponential backoff on auth routes.
 * Tracks attempts per IP and per account.
 */
class AuthBackoffTracker {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetAt && (!record.blockedUntil || now > record.blockedUntil)) {
          this.store.delete(key);
        }
      }
    }, 10 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  getRecord(key, windowMs) {
    const now = Date.now();
    let record = this.store.get(key);
    if (!record || now > record.resetAt) {
      record = {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        resetAt: now + windowMs,
        blockedUntil: null,
        backoffMultiplier: 0
      };
      this.store.set(key, record);
    }
    return record;
  }

  reset(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const authTracker = new AuthBackoffTracker();

/**
 * Auth Rate Limiter with Exponential Backoff
 * Stricter limits, combines per-IP and per-account tracking, progressive delay backoff.
 */
function createAuthLimiter() {
  return (req, res, next) => {
    const windowMs = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
    const maxAttempts = parseInt(process.env.RATE_LIMIT_AUTH_MAX || process.env.RATE_LIMIT_MAX || 10, 10);
    const baseBackoffMs = parseInt(process.env.AUTH_BACKOFF_BASE_MS, 10) || 2000;
    const maxBackoffMs = parseInt(process.env.AUTH_BACKOFF_MAX_MS, 10) || 60000;

    const ip = getClientIp(req);
    const account = (req.body?.email || req.body?.username || req.body?.clerk_id || '').toLowerCase().trim();

    const ipKey = `ip:${ip}`;
    const accKey = account ? `acc:${account}` : null;

    const now = Date.now();
    const ipRecord = authTracker.getRecord(ipKey, windowMs);
    const accRecord = accKey ? authTracker.getRecord(accKey, windowMs) : null;

    // Check if either IP or account is blocked under backoff
    const activeBlock = (ipRecord.blockedUntil && now < ipRecord.blockedUntil) ? ipRecord :
      (accRecord && accRecord.blockedUntil && now < accRecord.blockedUntil) ? accRecord : null;

    if (activeBlock) {
      const retryAfterSeconds = Math.max(1, Math.ceil((activeBlock.blockedUntil - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('RateLimit-Limit', String(maxAttempts));
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', String(retryAfterSeconds));
      return res.status(429).json({
        error: `Too many authentication attempts. Please try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`
      });
    }

    // Increment attempts
    ipRecord.attempts += 1;
    ipRecord.lastAttempt = now;
    if (accRecord) {
      accRecord.attempts += 1;
      accRecord.lastAttempt = now;
    }

    const currentAttempts = Math.max(ipRecord.attempts, accRecord ? accRecord.attempts : 0);

    if (currentAttempts > maxAttempts) {
      const triggeringRecord = ipRecord.attempts > maxAttempts ? ipRecord : accRecord;
      triggeringRecord.backoffMultiplier += 1;
      const backoffMs = Math.min(
        baseBackoffMs * Math.pow(2, triggeringRecord.backoffMultiplier - 1),
        maxBackoffMs
      );
      triggeringRecord.blockedUntil = now + backoffMs;
      const retryAfterSeconds = Math.max(1, Math.ceil(backoffMs / 1000));

      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('RateLimit-Limit', String(maxAttempts));
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', String(retryAfterSeconds));
      return res.status(429).json({
        error: `Too many authentication attempts. Please try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`
      });
    }

    const remaining = Math.max(0, maxAttempts - currentAttempts);
    const resetSeconds = Math.max(1, Math.ceil((ipRecord.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(maxAttempts));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    next();
  };
}

/**
 * Public Endpoint Rate Limiter (moderate limits for health, OCR, public routes)
 */
function createPublicLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000;
  const max = parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || 60, 10);

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-6',
    legacyHeaders: true,
    keyGenerator: (req) => getClientIp(req),
    validate: { trustProxy: false, xForwardedForHeader: false },
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        error: 'Too many requests to public endpoints, please try again later.'
      });
    }
  });
}

/**
 * Authenticated API Rate Limiter (looser limits for operational endpoints)
 * Uses userId if authenticated, falls back to IP.
 */
function createApiLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000;
  const max = parseInt(process.env.RATE_LIMIT_API_MAX || (process.env.NODE_ENV === 'test' ? 300 : 300), 10);

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-6',
    legacyHeaders: true,
    keyGenerator: (req) => {
      if (req.auth && req.auth.userId) {
        return `user:${req.auth.userId}`;
      }
      return `ip:${getClientIp(req)}`;
    },
    validate: { trustProxy: false, xForwardedForHeader: false },
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        error: 'Too many requests, please slow down.'
      });
    }
  });
}

module.exports = {
  authLimiter: createAuthLimiter(),
  publicLimiter: createPublicLimiter(),
  apiLimiter: createApiLimiter(),
  authTracker,
  getClientIp
};
