'use strict';

/**
 * ratelimit.api.test.js — Rate Limiting tests
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('./helpers/testApp');
const auth = require('./helpers/authHelper');
const db = require('./helpers/dbHelper');
const { authTracker } = require('../../middleware/rateLimiter');

test('Phase D: Rate Limiting', async (t) => {
  t.before(async () => {
    await db.setupSchema();
    await db.resetDb();
    await db.seed();
    authTracker.clear();
  });
  t.after(async () => {
    auth.clear();
    authTracker.clear();
    await db.teardown();
  });

  // ── Clerk-sync rate limit ─────────────────────────────────────────────────

  await t.test(
    'POST /auth/clerk-sync: 6th request within 1 minute → 429 Too Many Requests',
    async () => {
      authTracker.clear();
      const results = [];
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post('/api/auth/clerk-sync')
          .send({
            email: `ratelimit${i}@test.pharma`,
            full_name: `User ${i}`,
            username: `rluser${i}`
          });
        results.push(res.status);
      }
      assert.ok(results[0] === 200 || results[0] === 201, `1st request must succeed, got ${results[0]}`);
      assert.equal(results[5], 429, 'Sixth request must be rate-limited with 429');
    }
  );

  await t.test(
    'POST /auth/clerk-sync rate limit: response includes Retry-After and RateLimit headers',
    async () => {
      // 7th request while blocked
      const res = await request(app)
        .post('/api/auth/clerk-sync')
        .send({
          email: 'ratelimit99@test.pharma',
          full_name: 'User 99',
          username: 'rluser99'
        });

      assert.equal(res.status, 429);
      assert.ok(res.headers['retry-after'], 'Must include Retry-After header');
      assert.ok(res.headers['ratelimit-limit'], 'Must include RateLimit-Limit header');
      assert.equal(res.headers['ratelimit-remaining'], '0', 'Remaining attempts should be 0');
    }
  );

  await t.test(
    'POST /auth/clerk-sync: after rate limit tracker resets, request succeeds again',
    async () => {
      authTracker.clear();
      const res = await request(app)
        .post('/api/auth/clerk-sync')
        .send({
          email: 'ratelimit_reset@test.pharma',
          full_name: 'Reset User',
          username: 'rlreset'
        });

      assert.ok(res.status === 200 || res.status === 201, `Expected 200/201 after reset, got ${res.status}`);
    }
  );

  // ── General API rate limit ────────────────────────────────────────────────

  await t.test(
    'GET /inventory: rate limit headers present on API routes',
    async () => {
      auth.asAdmin();
      const res = await request(app).get('/api/inventory');
      assert.equal(res.status, 200);
      assert.ok(res.headers['ratelimit-limit'], 'Must have RateLimit-Limit header on /inventory');
      assert.ok(res.headers['ratelimit-remaining'], 'Must have RateLimit-Remaining header on /inventory');
    }
  );

  await t.test(
    'Rate limit headers must be present on every response (not just on 429)',
    async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.ok(res.headers['ratelimit-limit'], 'Must have RateLimit-Limit header on 200');
      assert.ok(res.headers['ratelimit-remaining'], 'Must have RateLimit-Remaining header on 200');
    }
  );

  await t.test(
    'Rate limit: different IPs get separate counters (X-Forwarded-For)',
    async () => {
      authTracker.clear();

      // Send 5 requests with X-Forwarded-For: 1.2.3.4 → all should succeed (200/201)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/clerk-sync')
          .set('X-Forwarded-For', '1.2.3.4')
          .send({
            email: `ip1_${i}@test.pharma`,
            full_name: `User IP1 ${i}`,
            username: `ip1user${i}`
          });
        assert.ok(res.status === 200 || res.status === 201, `Expected 200/201 for IP 1.2.3.4 #${i}, got ${res.status}`);
      }

      // Send 5 requests with X-Forwarded-For: 5.6.7.8 → all should succeed (200/201)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/clerk-sync')
          .set('X-Forwarded-For', '5.6.7.8')
          .send({
            email: `ip2_${i}@test.pharma`,
            full_name: `User IP2 ${i}`,
            username: `ip2user${i}`
          });
        assert.ok(res.status === 200 || res.status === 201, `Expected 200/201 for IP 5.6.7.8 #${i}, got ${res.status}`);
      }

      // 6th request from 1.2.3.4 should now be blocked
      const blockedRes1 = await request(app)
        .post('/api/auth/clerk-sync')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({
          email: 'ip1_blocked@test.pharma',
          username: 'ip1blocked'
        });
      assert.equal(blockedRes1.status, 429, 'IP 1.2.3.4 must be rate-limited on 6th request');

      // 6th request from 5.6.7.8 should now be blocked
      const blockedRes2 = await request(app)
        .post('/api/auth/clerk-sync')
        .set('X-Forwarded-For', '5.6.7.8')
        .send({
          email: 'ip2_blocked@test.pharma',
          username: 'ip2blocked'
        });
      assert.equal(blockedRes2.status, 429, 'IP 5.6.7.8 must be rate-limited on 6th request');
    }
  );

  // ── Rate limit response shape ─────────────────────────────────────────────

  await t.test(
    'Rate limit 429 response must have { error: string } shape',
    async () => {
      const res = await request(app)
        .post('/api/auth/clerk-sync')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({
          email: 'shape_check@test.pharma',
          username: 'shapecheck'
        });
      assert.equal(res.status, 429);
      assert.ok(typeof res.body.error === 'string', 'Rate limit response must have string error field');
      assert.ok(!JSON.stringify(res.body).includes('stack'), 'Must not leak stack');
    }
  );
});
