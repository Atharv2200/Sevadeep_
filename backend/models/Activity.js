const crypto = require('crypto');
const mongoose = require('mongoose');
const { STATUSES, CATEGORIES, DEFAULT_ATTENDANCE_MINUTES, LIMITS } = require('../config/activity');

// A volunteering event. Everything except the admin-editable content (status,
// createdBy, qrSecret, timestamps) is set by the server. The attendance window
// (opens/closes) is derived from these fields, never stored.
const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: LIMITS.title.min, maxlength: LIMITS.title.max },
    description: { type: String, required: true, trim: true, maxlength: LIMITS.description.max },
    category: { type: String, enum: CATEGORIES, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    locationName: { type: String, required: true, trim: true, maxlength: LIMITS.locationName.max },
    address: { type: String, trim: true, maxlength: LIMITS.address.max, default: '' },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    radiusMeters: {
      type: Number,
      required: true,
      min: LIMITS.radiusMeters.min,
      max: LIMITS.radiusMeters.max,
      validate: { validator: Number.isInteger, message: 'radiusMeters must be a whole number' },
    },
    instructions: { type: String, trim: true, maxlength: LIMITS.instructions.max, default: '' },
    // Stored per activity so a later change of the default never moves existing windows.
    attendanceOpensMinutesBefore: {
      type: Number,
      default: DEFAULT_ATTENDANCE_MINUTES,
      min: LIMITS.attendanceMinutes.min,
      max: LIMITS.attendanceMinutes.max,
    },
    attendanceClosesMinutesAfter: {
      type: Number,
      default: DEFAULT_ATTENDANCE_MINUTES,
      min: LIMITS.attendanceMinutes.min,
      max: LIMITS.attendanceMinutes.max,
    },
    status: { type: String, enum: STATUSES, default: 'DRAFT' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Signs attendance QR tokens (a later phase). Never selected by default and never serialized.
    qrSecret: {
      type: String,
      select: false,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
  },
  { timestamps: true }
);

activitySchema.index({ status: 1, startsAt: 1 });
activitySchema.index({ startsAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
