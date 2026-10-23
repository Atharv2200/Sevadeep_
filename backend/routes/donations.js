const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const donationService = require('../services/donationService');
const asyncHandler = require('../utils/asyncHandler');
const { objectId, pagination } = require('../validators/common');

const router = express.Router();

const schemas = {
  idParams: z.strictObject({ id: objectId }),
  list: z.strictObject({
    ...pagination,
    status: z.enum(['PENDING', 'PROCESSED', 'ALLOCATED']).optional(),
    activity: objectId.optional(),
    search: z.string().trim().max(100).optional(),
  }),
  create: z.strictObject({
    amount: z.number().min(1),
    activity: objectId.optional(),
    note: z.string().trim().max(500).optional(),
    donorName: z.string().trim().max(100).optional(),
    donorEmail: z
      .string()
      .trim()
      .email()
      .optional()
      .or(z.literal('')),
    status: z.enum(['PENDING', 'PROCESSED', 'ALLOCATED']).optional(),
  }),
  updateStatus: z.strictObject({
    status: z.enum(['PENDING', 'PROCESSED', 'ALLOCATED']),
  }),
  allocate: z.strictObject({
    activityIds: z.array(objectId).min(1),
  }),
};

// Public summary statistics for donors and landing pages
router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    res.json(await donationService.getPublicDonationStats());
  })
);

// List donations (admin sees all with summary stats; volunteers see their own)
router.get(
  '/',
  authenticate,
  validate({ query: schemas.list }),
  asyncHandler(async (req, res) => {
    res.json(await donationService.listDonations(req.user, req.query));
  })
);

// Get single donation details
router.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: schemas.idParams }),
  asyncHandler(async (req, res) => {
    res.json({ donation: await donationService.getDonation(req.user, req.params.id) });
  })
);

// Create donation (public guests, volunteers, or admins)
router.post(
  '/',
  optionalAuthenticate,
  validate({ body: schemas.create }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ donation: await donationService.createDonation(req.user, req.body) });
  })
);

// Update status (admin only)
router.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: schemas.idParams, body: schemas.updateStatus }),
  asyncHandler(async (req, res) => {
    res.json({ donation: await donationService.updateDonationStatus(req.user, req.params.id, req.body) });
  })
);

// Allocate donation to activities (admin only)
router.patch(
  '/:id/allocate',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: schemas.idParams, body: schemas.allocate }),
  asyncHandler(async (req, res) => {
    res.json({ donation: await donationService.allocateDonation(req.user, req.params.id, req.body) });
  })
);

// Get donation impact
router.get(
  '/:id/impact',
  optionalAuthenticate,
  validate({ params: schemas.idParams }),
  asyncHandler(async (req, res) => {
    res.json(await donationService.getDonationImpact(req.user, req.params.id));
  })
);

module.exports = router;
