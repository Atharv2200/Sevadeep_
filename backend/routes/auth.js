const express = require('express');
const validate = require('../middleware/validate');
const { authenticateAllowingPasswordChange } = require('../middleware/authenticate');
const { limiters } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { setAuthCookie, clearAuthCookie } = require('../utils/authToken');
const schemas = require('../validators/auth');

const router = express.Router();

// Volunteer self-registration. Logs the new volunteer in straight away.
router.post(
  '/register',
  validate({ body: schemas.register }),
  limiters.register,
  asyncHandler(async (req, res) => {
    const user = await authService.registerVolunteer(req.body);
    setAuthCookie(res, user);
    res.status(201).json({ user: await authService.describeUser(user) });
  })
);

router.post(
  '/login',
  validate({ body: schemas.login }),
  limiters.loginByIp,
  limiters.loginByAccount,
  asyncHandler(async (req, res) => {
    const user = await authService.login(req.body);
    setAuthCookie(res, user);
    res.json({ user: await authService.describeUser(user) });
  })
);

// Clears the cookie. Tokens are stateless, so this signs the browser out; it does
// not revoke a token that was copied elsewhere (changing the password does).
router.post('/logout', validate(), (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.get(
  '/me',
  authenticateAllowingPasswordChange,
  validate(),
  asyncHandler(async (req, res) => {
    res.json({ user: await authService.describeUser(req.user) });
  })
);

router.post(
  '/change-password',
  authenticateAllowingPasswordChange,
  limiters.changePassword,
  validate({ body: schemas.changePassword }),
  asyncHandler(async (req, res) => {
    const user = await authService.changePassword(req.user._id, req.body);
    setAuthCookie(res, user);
    res.json({ user: await authService.describeUser(user) });
  })
);

module.exports = router;
