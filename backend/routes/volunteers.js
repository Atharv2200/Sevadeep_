const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const volunteerService = require('../services/volunteerService');
const { getVolunteerStats } = require('../services/statsService');
const asyncHandler = require('../utils/asyncHandler');
const { Volunteer } = require('../models');
const { serializeVolunteer } = require('../utils/serializers');
const schemas = require('../validators/volunteer');

const router = express.Router();

router.use(authenticate);

// The caller's own profile plus derived dashboard statistics. Registered before /:id.
router.get(
  '/me',
  requireRole('VOLUNTEER'),
  validate(),
  asyncHandler(async (req, res) => {
    const volunteer = await Volunteer.findById(req.user.volunteer);
    res.json({
      volunteer: { ...serializeVolunteer(volunteer), email: req.user.email },
      stats: await getVolunteerStats(volunteer._id),
    });
  })
);

// Name and phone only. Email, volunteerId, status and role are not editable here.
router.patch(
  '/me',
  requireRole('VOLUNTEER'),
  validate({ body: schemas.updateMe }),
  asyncHandler(async (req, res) => {
    const volunteer = await volunteerService.updateProfile(req.user.volunteer, req.body);
    res.json({ volunteer: { ...serializeVolunteer(volunteer), email: req.user.email } });
  })
);

router.get(
  '/',
  requireRole('ADMIN'),
  validate({ query: schemas.list }),
  asyncHandler(async (req, res) => {
    res.json(await volunteerService.listVolunteers(req.query));
  })
);

router.get(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: schemas.idParams }),
  asyncHandler(async (req, res) => {
    const volunteer = await volunteerService.getVolunteer(req.params.id);
    res.json({ volunteer, stats: await getVolunteerStats(req.params.id) });
  })
);

router.patch(
  '/:id/status',
  requireRole('ADMIN'),
  validate({ params: schemas.idParams, body: schemas.setStatus }),
  asyncHandler(async (req, res) => {
    res.json({ volunteer: await volunteerService.setVolunteerStatus(req.params.id, req.body.status) });
  })
);

module.exports = router;
