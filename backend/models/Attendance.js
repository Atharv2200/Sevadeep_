const mongoose = require('mongoose');

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

// One volunteer's presence at one activity. Only successful check-ins are stored.
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
  },
  { timestamps: true }
);

// The database, not the application, guarantees one record per volunteer and activity.
attendanceSchema.index({ activity: 1, volunteer: 1 }, { unique: true });
attendanceSchema.index({ volunteer: 1, checkedInAt: -1 });
attendanceSchema.index({ activity: 1, checkedInAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
