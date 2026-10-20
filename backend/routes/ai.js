const express = require('express');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');
const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');
const { z } = require('zod');

const router = express.Router();

router.use(requireRole('ADMIN'));

// Generate activity description
router.post(
  '/generate-description',
  validate({
    body: {
      category: z.string().required(),
      locationName: z.string().required(),
      startsAt: z.string().required(),
      endsAt: z.string().required(),
    },
  }),
  asyncHandler(async (req, res) => {
    const description = await aiService.generateActivityDescription(req.body);
    res.json({ description });
  })
);

// Generate donor impact report
router.post(
  '/generate-impact-report',
  validate({
    body: {
      donation: z.object({
        amount: z.number().required(),
        status: z.string().required(),
      }).required(),
      activities: z.array(z.object({
        title: z.string().required(),
        category: z.string().required(),
      })).required(),
      completions: z.array(z.object({
        volunteer: z.object({
          name: z.string().required(),
        }).required(),
        activity: z.object({
          title: z.string().required(),
        }).required(),
        creditHours: z.number().required(),
      })).required(),
      totalHours: z.number().required(),
      totalCompletions: z.number().required(),
    },
  }),
  asyncHandler(async (req, res) => {
    const report = await aiService.generateDonorImpactReport(req.body);
    res.json({ report });
  })
);

// Generate social media caption
router.post(
  '/generate-caption',
  validate({
    body: {
      activityTitle: z.string().required(),
      category: z.string().required(),
      description: z.string().required(),
    },
  }),
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
