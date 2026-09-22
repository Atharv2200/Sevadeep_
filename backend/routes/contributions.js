const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const contributionService = require('../services/contributionService');
const asyncHandler = require('../utils/asyncHandler');
const schemas = require('../validators/contribution');

const router = express.Router();

router.use(authenticate);

// A volunteer's history is always their own, so only admins may pick a volunteer.
const validateList = (req, res, next) =>
  validate({ query: req.user.role === 'ADMIN' ? schemas.listForAdmin : schemas.listForVolunteer })(req, res, next);

router.get(
  '/',
  validateList,
  asyncHandler(async (req, res) => {
    res.json(await contributionService.listContributions(req.user, req.query));
  })
);

router.get(
  '/:id',
  validate({ params: schemas.idParams }),
  asyncHandler(async (req, res) => {
    res.json({ contribution: await contributionService.getContribution(req.user, req.params.id) });
  })
);

router.post(
  '/',
  requireRole('VOLUNTEER'),
  validate({ body: schemas.create }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ contribution: await contributionService.createContribution(req.user, req.body) });
  })
);

// Description only, and only while PENDING (enforced by the service).
router.patch(
  '/:id',
  requireRole('VOLUNTEER'),
  validate({ params: schemas.idParams, body: schemas.update }),
  asyncHandler(async (req, res) => {
    res.json({ contribution: await contributionService.updateContribution(req.user, req.params.id, req.body) });
  })
);

// Admin verdict. Separate from the plain PATCH above the way activity status has its own route.
router.patch(
  '/:id/review',
  requireRole('ADMIN'),
  validate({ params: schemas.idParams, body: schemas.review }),
  asyncHandler(async (req, res) => {
    res.json({ contribution: await contributionService.reviewContribution(req.user, req.params.id, req.body) });
  })
);

module.exports = router;
