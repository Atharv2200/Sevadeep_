const express = require('express');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');
const { limiters } = require('../middleware/rateLimit');
const attendanceService = require('../services/attendanceService');
const asyncHandler = require('../utils/asyncHandler');
const activitySchemas = require('../validators/activity');
const schemas = require('../validators/attendance');

// Mounted at /api/activities/:id/attendance by routes/activities.js, which has
// already authenticated the caller.
const router = express.Router({ mergeParams: true });

router.post(
  '/',
  requireRole('VOLUNTEER'),
  validate({ params: activitySchemas.idParams, body: schemas.checkIn }),
  limiters.attendance,
  asyncHandler(async (req, res) => {
    res.status(201).json({ attendance: await attendanceService.checkIn(req.user, req.params.id, req.body) });
  })
);

router.post(
  '/check-out',
  requireRole('VOLUNTEER'),
  validate({ params: activitySchemas.idParams, body: schemas.checkOut }),
  limiters.attendance,
  asyncHandler(async (req, res) => {
    res.json({ attendance: await attendanceService.checkOut(req.user, req.params.id, req.body) });
  })
);

module.exports = router;
