const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { photosUpload, requirePhotosUpload } = require('../middleware/upload');
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

// `photosUpload` only engages for a multipart request, so plain-JSON creation
// (no photos) keeps working exactly as before.
router.post(
  '/',
  requireRole('VOLUNTEER'),
  photosUpload,
  validate({ body: schemas.create }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ contribution: await contributionService.createContribution(req.user, req.body, req.files) });
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

// Adds photos to the caller's own PENDING contribution.
router.post(
  '/:id/photos',
  requireRole('VOLUNTEER'),
  validate({ params: schemas.idParams }),
  requirePhotosUpload,
  asyncHandler(async (req, res) => {
    res.status(201).json({ contribution: await contributionService.addPhotos(req.user, req.params.id, req.files) });
  })
);

// Removes one photo from the caller's own PENDING contribution.
router.delete(
  '/:id/photos/:photoId',
  requireRole('VOLUNTEER'),
  validate({ params: schemas.photoParams }),
  asyncHandler(async (req, res) => {
    res.json({ contribution: await contributionService.removePhoto(req.user, req.params.id, req.params.photoId) });
  })
);

// A photo's bytes: the owning volunteer or any admin, never anyone else. Never
// served from a static directory, so this is the only way to reach one.
router.get(
  '/:id/photos/:photoId',
  validate({ params: schemas.photoParams }),
  asyncHandler(async (req, res) => {
    const { buffer, mimeType } = await contributionService.getPhoto(req.user, req.params.id, req.params.photoId);
    res.set('Content-Type', mimeType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
    res.send(buffer);
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
