const { allowedOrigins } = require('../config/env');
const AppError = require('../utils/AppError');

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF defence in depth on top of SameSite=Lax cookies: a browser always sends
// Origin on state-changing requests, so one that is not our own web app is refused.
// Requests without an Origin header (curl, server-to-server, tests) carry no
// ambient browser credentials and are let through.
function originCheck(req, res, next) {
  if (STATE_CHANGING.has(req.method)) {
    const origin = req.get('origin');
    if (origin !== undefined && !allowedOrigins.includes(origin)) {
      return next(new AppError(403, 'Request origin not allowed', { code: 'INVALID_ORIGIN' }));
    }
  }
  return next();
}

module.exports = originCheck;
