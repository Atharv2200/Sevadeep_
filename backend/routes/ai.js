const express = require('express');
const requireRole = require('../middleware/requireRole');
const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireRole('ADMIN'));

// Generate activity description
router.post(
  '/generate-description',
  asyncHandler(async (req, res) => {
    const description = await aiService.generateActivityDescription(req.body);
    res.json({ description });
  })
);

// Generate donor impact report
router.post(
  '/generate-impact-report',
  asyncHandler(async (req, res) => {
    const report = await aiService.generateDonorImpactReport(req.body);
    res.json({ report });
  })
);

// Generate social media caption
router.post(
  '/generate-caption',
  asyncHandler(async (req, res) => {
    const caption = await aiService.generateSocialMediaCaption(req.body);
    res.json({ caption });
  })
);

// Check Groq availability
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const available = await aiService.checkGroqAvailability();
    res.json({ available });
  })
);

module.exports = router;
