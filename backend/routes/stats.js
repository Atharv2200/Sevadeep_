const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getAdminStats } = require('../services/statsService');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// A platform-wide summary for the admin overview, derived from the same
// Attendance/Contribution/Activity/User records as everywhere else. A
// volunteer's own stats are served alongside their profile by GET /volunteers/me.
router.get(
  '/admin',
  requireRole('ADMIN'),
  validate(),
  asyncHandler(async (req, res) => {
    res.json(await getAdminStats());
  })
);

module.exports = router;
