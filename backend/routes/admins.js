const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { serializeUser } = require('../utils/serializers');
const schemas = require('../validators/auth');

const router = express.Router();

// An existing admin creates another admin with a temporary password. There is no
// email delivery in v1: the creating admin hands the password over out of band, and
// the new admin is forced to change it on first login (mustChangePassword).
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: schemas.createAdmin }),
  asyncHandler(async (req, res) => {
    const { name, email, temporaryPassword } = req.body;
    const user = await authService.createAdmin({
      name,
      email,
      password: temporaryPassword,
      mustChangePassword: true,
    });
    res.status(201).json({ user: serializeUser(user) });
  })
);

module.exports = router;
