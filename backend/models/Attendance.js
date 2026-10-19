const mongoose = require('mongoose');
const { PHOTO } = require('../config/contribution');

// Where the volunteer was when they checked in or out, as evidence. The distance is
// always calculated by the server, never taken from the client.
const evidenceSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, required: true, min: 0 },
    distanceMeters: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Metadata for documentation photos. The binary lives on disk under `key`.
const photoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    mimeType: { type: String, required: true, enum: PHOTO.allowedMimeTypes },
    size: { type: Number, required: true, min: 1 },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
  },
  { timestamps: true }
);

// Documentation submitted by volunteer as proof of completion
const documentationSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    photos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: (photos) => photos.length >= 1 && photos.length <= PHOTO.maxCount,
        message: `Documentation must have between 1 and ${PHOTO.maxCount} photos`,
      },
    },
    locationEvidence: { type: evidenceSchema, required: true },
  },
  { _id: false }
);

// One volunteer's presence at one activity. Now supports completion documentation.
// Suspicious flags are derived when read, never stored; duration is derived from the
// two timestamps; totals are computed from these records.
const attendanceSchema = new mongoose.Schema(
  {
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
    checkedInAt: { type: Date, required: true },
    checkedOutAt: { type: Date, default: null },
    checkIn: { type: evidenceSchema, required: true },
    checkOut: { type: evidenceSchema, default: null },
    // New fields for completion system
    documentation: { type: documentationSchema, default: null },
    creditHours: { type: Number, default: null, min: 0 },
    autoApproved: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The database, not the application, guarantees one record per volunteer and activity.
attendanceSchema.index({ activity: 1, volunteer: 1 }, { unique: true });
attendanceSchema.index({ volunteer: 1, checkedInAt: -1 });
attendanceSchema.index({ activity: 1, checkedInAt: -1 });
attendanceSchema.index({ autoApproved: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
