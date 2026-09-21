const jwt = require('jsonwebtoken');
const { jwtSecret, isProduction } = require('../config/env');

const COOKIE_NAME = 'sevadeep_token';
const LIFETIME_SECONDS = 7 * 24 * 60 * 60;

// httpOnly keeps the token away from page scripts; path=/api stops the browser
// sending it for anything but API calls; Secure is enforced in production (https).
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/api' };

// The token only names the account (sub) and the token generation (tv). Role and
// status are read from the database on every request, so they can never go stale.
function signToken(user) {
  return jwt.sign({ tv: user.tokenVersion }, jwtSecret, {
    algorithm: 'HS256',
    subject: String(user._id),
    expiresIn: LIFETIME_SECONDS,
  });
}

// Throws on a bad signature, wrong algorithm or expiry.
function verifyToken(token) {
  return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), { ...cookieOptions, maxAge: LIFETIME_SECONDS * 1000 });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
