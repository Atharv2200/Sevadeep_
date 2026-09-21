const { User } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { COOKIE_NAME, verifyToken } = require('../utils/authToken');

const OBJECT_ID = /^[0-9a-f]{24}$/i;

function invalidSession() {
  return new AppError(401, 'Your session is invalid or has expired', { code: 'INVALID_SESSION' });
}

// Resolves the caller from the auth cookie and loads the account on every request,
// so suspension, role changes and password changes take effect immediately.
// Sets req.user (a User document).
function build({ allowPasswordChangePending }) {
  return asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      throw new AppError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw invalidSession();
    }
    if (typeof payload.sub !== 'string' || !OBJECT_ID.test(payload.sub)) throw invalidSession();

    const user = await User.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) throw invalidSession();

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'This account is suspended', { code: 'ACCOUNT_SUSPENDED' });
    }
    // An admin created with a temporary password may do nothing else until they change it.
    if (user.mustChangePassword && !allowPasswordChangePending) {
      throw new AppError(403, 'You must change your password before continuing', {
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    req.user = user;
    next();
  });
}

const authenticate = build({ allowPasswordChangePending: false });
// For the few routes a user with a pending password change may still call.
const authenticateAllowingPasswordChange = build({ allowPasswordChangePending: true });

module.exports = { authenticate, authenticateAllowingPasswordChange };
