const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { rateLimitEnabled } = require('../config/env');
const AppError = require('../utils/AppError');

const MINUTE = 60 * 1000;

// `enabled` exists so a test can exercise a limiter that is switched off for the
// rest of the suite. The in-memory store is per process, which is fine for a
// single instance; multiple instances would need a shared store.
function createLimiter({ windowMs, limit, keyGenerator, skipSuccessfulRequests = false, enabled = rateLimitEnabled }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    skip: () => !enabled,
    handler: (req, res, next) =>
      next(new AppError(429, 'Too many requests, please try again later', { code: 'RATE_LIMITED' })),
  });
}

const byIp = (req) => ipKeyGenerator(req.ip);

// Limiters that read req.body.email must run after validate().
function buildLimiters(enabled) {
  return {
    register: createLimiter({ windowMs: 60 * MINUTE, limit: 10, keyGenerator: byIp, enabled }),
    // Only failed logins count: one limiter per client, one per client+account.
    loginByIp: createLimiter({
      windowMs: 15 * MINUTE,
      limit: 50,
      keyGenerator: byIp,
      skipSuccessfulRequests: true,
      enabled,
    }),
    loginByAccount: createLimiter({
      windowMs: 15 * MINUTE,
      limit: 10,
      keyGenerator: (req) => `${byIp(req)}|${req.body.email}`,
      skipSuccessfulRequests: true,
      enabled,
    }),
    // Guessing the current password with a stolen session. Runs after authenticate().
    changePassword: createLimiter({
      windowMs: 15 * MINUTE,
      limit: 10,
      keyGenerator: (req) => String(req.user.id),
      skipSuccessfulRequests: true,
      enabled,
    }),
  };
}

const limiters = buildLimiters(rateLimitEnabled);

module.exports = { createLimiter, buildLimiters, limiters };
