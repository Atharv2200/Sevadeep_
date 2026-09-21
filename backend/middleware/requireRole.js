const AppError = require('../utils/AppError');

// Must run after authenticate. Frontend route guards are only UX; this is the real check.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have access to this resource', { code: 'FORBIDDEN' }));
    }
    return next();
  };
}

module.exports = requireRole;
