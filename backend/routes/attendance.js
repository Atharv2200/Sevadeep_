const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const attendanceService = require('../services/attendanceService');
const asyncHandler = require('../utils/asyncHandler');
const schemas = require('../validators/attendance');

const router = express.Router();

router.use(authenticate);

// Attendance history. Volunteers get their own records; admins get everyone's and can
// filter by activity or volunteer, so the accepted query depends on the caller's role.
const validateHistory = (req, res, next) =>
  validate({ query: req.user.role === 'ADMIN' ? schemas.historyForAdmin : schemas.historyForVolunteer })(req, res, next);

router.get(
  '/',
  validateHistory,
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.listHistory(req.user, req.query));
  })
);

module.exports = router;
