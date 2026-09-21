const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const activityService = require('../services/activityService');
const asyncHandler = require('../utils/asyncHandler');
const schemas = require('../validators/activity');

const router = express.Router();

router.use(authenticate);

// Volunteers cannot filter by status (they only ever see OPEN activities), so the
// accepted query depends on the caller's role.
const validateList = (req, res, next) =>
  validate({ query: req.user.role === 'ADMIN' ? schemas.listForAdmin : schemas.listForVolunteer })(req, res, next);

router.get(
  '/',
  validateList,
  asyncHandler(async (req, res) => {
    res.json(await activityService.listActivities(req.user, req.query));
  })
);

router.get(
  '/:id',
  validate({ params: schemas.idParams }),
  asyncHandler(async (req, res) => {
    res.json({ activity: await activityService.getActivity(req.user, req.params.id) });
  })
);

router.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: schemas.create }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ activity: await activityService.createActivity(req.user, req.body) });
  })
);

// Content only. Status has its own endpoint.
router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: schemas.idParams, body: schemas.update }),
  asyncHandler(async (req, res) => {
    res.json({ activity: await activityService.updateActivity(req.user, req.params.id, req.body) });
  })
);

router.patch(
  '/:id/status',
  requireRole('ADMIN'),
  validate({ params: schemas.idParams, body: schemas.setStatus }),
  asyncHandler(async (req, res) => {
    res.json({ activity: await activityService.changeStatus(req.user, req.params.id, req.body.status) });
  })
);

module.exports = router;
