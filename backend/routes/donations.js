const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');
const donationService = require('../services/donationService');
const asyncHandler = require('../utils/asyncHandler');
const { objectId, pagination } = require('../validators/common');

const router = express.Router();

router.use(requireRole('ADMIN'));

const idParams = validate({ params: { id: objectId } });

const listQuery = validate({
  query: {
    ...pagination,
    status: z.enum(['PENDING', 'PROCESSED', 'ALLOCATED']).optional(),
  },
});

const createBody = validate({
  body: {
    amount: z.number().min(1),
    activity: objectId.optional(),
    note: z.string().trim().max(500).optional(),
  },
});

const updateStatusBody = validate({
  body: {
    status: z.enum(['PENDING', 'PROCESSED', 'ALLOCATED']),
  },
});

const allocateBody = validate({
  body: {
    activityIds: z.array(objectId).min(1),
  },
});

router.get(
  '/',
  listQuery,
  asyncHandler(async (req, res) => {
    res.json(await donationService.listDonations(req.user, req.query));
  })
);

router.get(
  '/:id',
  idParams,
  asyncHandler(async (req, res) => {
    res.json({ donation: await donationService.getDonation(req.user, req.params.id) });
  })
);

router.post(
  '/',
  createBody,
  asyncHandler(async (req, res) => {
    res.status(201).json({ donation: await donationService.createDonation(req.user, req.body) });
  })
);

router.patch(
  '/:id/status',
  idParams,
  updateStatusBody,
  asyncHandler(async (req, res) => {
    res.json({ donation: await donationService.updateDonationStatus(req.user, req.params.id, req.body) });
  })
);

router.patch(
  '/:id/allocate',
  idParams,
  allocateBody,
  asyncHandler(async (req, res) => {
    res.json({ donation: await donationService.allocateDonation(req.user, req.params.id, req.body) });
  })
);

router.get(
  '/:id/impact',
  idParams,
  asyncHandler(async (req, res) => {
    res.json(await donationService.getDonationImpact(req.user, req.params.id));
  })
);

module.exports = router;
