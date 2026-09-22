'use strict';

/**
 * testApp.js — Test application factory
 * ─────────────────────────────────────────────────────────────────────────────
 * Must be the FIRST require in every test file. It:
 *   1. Loads .env.test and validates that DB_NAME contains "test"
 *   2. Patches @clerk/express BEFORE server.js is loaded, so no real
 *      Clerk network calls are made and no real JWT is needed in tests
 *   3. Returns the Express app for use with Supertest
 *
 * Auth mock strategy:
 *   The patched clerkMiddleware() reads from a module-level _mockAuth slot.
 *   Call setMockAuth({ userId, sessionClaims: { email } }) before a request.
 *   Call clearMockAuth() after (or use authHelper.js wrappers).
 *
 * IMPORTANT: node:test runs each test FILE in its own process, so the
 * require cache is fresh per file — the patch is always applied before server.
 */

const path = require('path');

// ── 1. Load test env BEFORE anything else ────────────────────────────────────
require('dotenv').config({
  path: path.join(__dirname, '../../../.env.test'),
  override: true
});

// ── 2. Safety guard — abort if DB_NAME doesn't look like a test DB ───────────
const dbName = process.env.DB_NAME || '';
if (!dbName.toLowerCase().includes('test')) {
  process.stderr.write(
    `\n[ABORT] DB_NAME="${dbName}" does not look like a test database.\n` +
    `Set DB_NAME to a name containing "test" in backend/.env.test\n` +
    `NEVER run API tests against the production database.\n\n`
  );
  process.exit(1);
}

// ── 3. Patch @clerk/express before server.js is required ─────────────────────
let _mockAuth = null;

/**
 * Set the Clerk auth identity that will be injected into req.auth
 * for the NEXT request. Call clearMockAuth() after the request completes,
 * or use authHelper.js which manages this automatically.
 *
 * @param {{ userId: string, sessionClaims: { email: string } } | null} auth
 */
function setMockAuth(auth) {
  _mockAuth = auth;
}

/** Remove the mock auth (simulate unauthenticated request). */
function clearMockAuth() {
  _mockAuth = null;
}

// Intercept Node's module loader to swap in the mock
const Module = require('module');
const _originalLoad = Module._load;

Module._load = function clerkMockLoader(request, parent, isMain) {
  if (request === '@clerk/express') {
    return {
      // Passthrough middleware that injects the mock auth into req.auth
      clerkMiddleware: () => (req, _res, next) => {
        if (_mockAuth) req.auth = _mockAuth;
        next();
      },
      // getAuth() is used by authenticateToken + roleCheck
      getAuth: (req) => req.auth || null,
      clerkClient: {
        users: {
          createUser: async (params) => {
            const email = params.emailAddress?.[0] || 'test@clerk.user';
            if (email.includes('duplicate') || email === 'taken@test.pharma') {
              const err = new Error('That email address is taken. Please try another.');
              err.errors = [{ message: err.message, longMessage: err.message }];
              throw err;
            }
            return {
              id: 'clerk_user_' + Math.random().toString(36).slice(2, 10),
              emailAddresses: [{ emailAddress: email }],
              firstName: params.firstName,
              lastName: params.lastName,
            };
          },
          getUser: async (userId) => {
            return {
              id: userId,
              emailAddresses: [{ emailAddress: _mockAuth?.sessionClaims?.email || 'user@test.pharma' }]
            };
          }
        }
      }
    };
  }
  if (request === 'tesseract.js') {
    return {
      recognize: async (imagePath) => {
        if (typeof imagePath === 'string' && (imagePath.endsWith('.txt') || imagePath.includes('fail'))) {
          throw new Error('Error attempting to read image.');
        }
        return {
          data: {
            text: 'Paracetamol 10 15.50\nAmoxicillin 5 25.00\n'
          }
        };
      }
    };
  }
  return _originalLoad.apply(this, arguments);
};

// Intercept pg.Pool to disable SSL when connecting to localhost test DB and allow exit on idle
const pg = require('pg');
const OriginalPool = pg.Pool;
class TestPool extends OriginalPool {
  constructor(config) {
    const opts = { ...config, allowExitOnIdle: true };
    if (opts && (opts.host === 'localhost' || opts.host === '127.0.0.1')) {
      opts.ssl = false;
    }
    super(opts);
  }
}
pg.Pool = TestPool;

// ── 4. Now safe to require server (db + clerk middleware will use mocks) ──────
const app = require('../../../server');

module.exports = { app, setMockAuth, clearMockAuth };
