const mongoose = require('mongoose');
const { STATUSES, MAX_HOURS, LIMITS, PHOTO } = require('../config/contribution');

// Who reviewed it, when, and an optional note. Empty (all null/'') until reviewed.
const reviewSchema = new mongoose.Schema(
  {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: LIMITS.reviewNote.max, default: '' },
  },
  { _id: false }
);

// Metadata only: the binary lives on disk (or later, object storage) under `key`,
// never in MongoDB. `_id` is the id the photo endpoints address it by.
const photoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    mimeType: { type: String, required: true, enum: PHOTO.allowedMimeTypes },
    size: { type: Number, required: true, min: 1 },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
  },
  { timestamps: true }
);

// A volunteer's account of one Attendance, pending admin verification.
// `approvedHours` is set only by review (never by the volunteer) and only
// counts toward verifiedHours while status is VERIFIED. `revision` guards
// against reviewing a version the admin never actually saw.
const contributionSchema = new mongoose.Schema(
  {
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    description: { type: String, required: true, trim: true, maxlength: LIMITS.description.max },
    status: { type: String, enum: STATUSES, default: 'PENDING' },
    revision: { type: Number, default: 0 },
    approvedHours: { type: Number, default: null, min: 0, max: MAX_HOURS },
    review: { type: reviewSchema, default: () => ({}) },
    photos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: (photos) => photos.length <= PHOTO.maxCount,
        message: `A contribution may have at most ${PHOTO.maxCount} photos`,
      },
    },
  },
  { timestamps: true }
);

// One contribution per attendance, enforced by the database.
contributionSchema.index({ attendance: 1 }, { unique: true });
contributionSchema.index({ volunteer: 1, createdAt: -1 });
contributionSchema.index({ activity: 1, createdAt: -1 });
contributionSchema.index({ status: 1 });

module.exports = mongoose.model('Contribution', contributionSchema);
