const express = require('express');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');
const { limiters } = require('../middleware/rateLimit');
const { requirePhotosUpload } = require('../middleware/upload');
const attendanceService = require('../services/attendanceService');
const asyncHandler = require('../utils/asyncHandler');
const activitySchemas = require('../validators/activity');
const schemas = require('../validators/attendance');

// Mounted at /api/activities/:id/attendance by routes/activities.js, which has
// already authenticated the caller.
const router = express.Router({ mergeParams: true });

// Live attendance for the admin's screen.
router.get(
  '/',
  requireRole('ADMIN'),
  validate({ params: activitySchemas.idParams }),
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.listLive(req.params.id));
  })
);

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

// Complete activity with documentation (photos + description + location)
router.post(
  '/complete',
  requireRole('VOLUNTEER'),
  requirePhotosUpload,
  validate({ params: activitySchemas.idParams, body: schemas.complete }),
  limiters.attendance,
  asyncHandler(async (req, res) => {
    // Parse location from form data (it comes as strings)
    const body = {
      ...req.body,
      token: req.body.token,
      description: req.body.description,
      latitude: parseFloat(req.body.latitude),
      longitude: parseFloat(req.body.longitude),
      accuracy: parseFloat(req.body.accuracy),
    };
    res.status(201).json({ attendance: await attendanceService.completeActivity(req.user, req.params.id, body, req.files) });
  })
);

module.exports = router;
