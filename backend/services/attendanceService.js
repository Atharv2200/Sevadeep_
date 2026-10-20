const { Activity, Attendance } = require('../models');
const AppError = require('../utils/AppError');
const { attendanceWindow } = require('../utils/attendanceWindow');
const { distanceMeters } = require('../utils/geo');
const { serializeAttendance } = require('../utils/serializers');
const { issueQr, verifyToken } = require('./qrTokenService');
const storage = require('./storage');
const { processImage } = require('./imageProcessing');
const { PHOTO } = require('../config/contribution');

// Everything here is decided by the server: who the caller is, the activity's state,
// the attendance window, the QR token, and where the volunteer is. The browser only
// reports a position; it never supplies a time, a distance or an owner.

const FENCE_ATTEMPTS = 2;

function notFound() {
  return new AppError(404, 'Activity not found', { code: 'NOT_FOUND' });
}

// DRAFT activities do not exist as far as volunteers are concerned.
function assertVisible(activity) {
  if (!activity || activity.status === 'DRAFT') throw notFound();
}

function assertNotClosed(activity) {
  if (activity.status === 'CANCELLED') {
    throw new AppError(409, 'This activity has been cancelled', { code: 'ACTIVITY_CANCELLED' });
  }
  if (activity.status === 'CLOSED') {
    throw new AppError(409, 'This activity is closed', { code: 'ACTIVITY_CLOSED' });
  }
}

// Judges a reported position. Rejections carry no numbers: the volunteer is told
// what to do, not how far away the check thinks they are.
// Returns the evidence to store, with the server-calculated distance. Reported
// accuracy is not a rejection criterion (see attendanceFlags.LOW_ACCURACY): it is
// only ever stored as evidence and surfaced to admins as an informational flag.
function assessLocation(activity, { latitude, longitude, accuracy }) {
  const distance = distanceMeters(activity, { latitude, longitude });
  if (distance > activity.radiusMeters) {
    throw new AppError(422, 'You do not appear to be at the venue.', { code: 'OUT_OF_RADIUS' });
  }
  return { latitude, longitude, accuracy, distanceMeters: Math.round(distance * 10) / 10 };
}

// Records a check-in. `now` exists so time-dependent rules can be tested exactly.
async function checkIn(user, activityId, input, { now = new Date() } = {}) {
  for (let attempt = 1; attempt <= FENCE_ATTEMPTS; attempt += 1) {
    const activity = await Activity.findById(activityId).select('+qrSecret');
    assertVisible(activity);
    assertNotClosed(activity);
    if (!attendanceWindow(activity, now).isOpen) {
      throw new AppError(409, 'Attendance is not open for this activity right now', { code: 'ATTENDANCE_WINDOW_CLOSED' });
    }
    // The token is checked before the location, so a caller without a valid code
    // learns nothing about where the venue check draws its line.
    verifyToken(activity, input.token, now);
    const evidence = assessLocation(activity, input);

    // Fence: lock the location fields, but only if they and the status are still what
    // this check used. If an admin edited them in the meantime, judge again.
    const fenced = await Activity.findOneAndUpdate(
      {
        _id: activity._id,
        status: 'OPEN',
        latitude: activity.latitude,
        longitude: activity.longitude,
        radiusMeters: activity.radiusMeters,
      },
      { $set: { locationLocked: true } }
    );
    if (!fenced) continue;

    try {
      const attendance = await Attendance.create({
        activity: activity._id,
        volunteer: user.volunteer,
        checkedInAt: now,
        checkIn: evidence,
      });
      return serializeAttendance(attendance, activity);
    } catch (error) {
      // The unique {activity, volunteer} index is the final word on duplicates.
      if (error.code === 11000) {
        throw new AppError(409, 'You have already checked in to this activity', { code: 'ALREADY_CHECKED_IN' });
      }
      throw error;
    }
  }
  throw new AppError(409, 'This activity was just updated. Please try again.', { code: 'ACTIVITY_CHANGED' });
}

// Records a check-out for the caller's own attendance. No QR is needed: the session
// identifies the volunteer and the position must satisfy the same accuracy and radius
// rules as check-in. It is allowed while the activity is OPEN or CLOSED (closing early
// does not strand people who are still there) and until the attendance window ends.
async function checkOut(user, activityId, input, { now = new Date() } = {}) {
  const activity = await Activity.findById(activityId);
  assertVisible(activity);

  const attendance = await Attendance.findOne({ activity: activity._id, volunteer: user.volunteer });
  if (!attendance) throw new AppError(404, 'You have not checked in to this activity', { code: 'NOT_CHECKED_IN' });
  if (attendance.checkedOutAt) {
    throw new AppError(409, 'You have already checked out of this activity', { code: 'ALREADY_CHECKED_OUT' });
  }
  if (activity.status === 'CANCELLED') {
    throw new AppError(409, 'This activity has been cancelled', { code: 'ACTIVITY_CANCELLED' });
  }
  if (now > attendanceWindow(activity, now).closesAt) {
    throw new AppError(409, 'The attendance window for this activity has ended', { code: 'ATTENDANCE_WINDOW_CLOSED' });
  }
  const evidence = assessLocation(activity, input);

  // Conditional on still being checked in, so two racing check-outs cannot both win.
  const updated = await Attendance.findOneAndUpdate(
    { _id: attendance._id, checkedOutAt: null },
    { $set: { checkedOutAt: now, checkOut: evidence } },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'You have already checked out of this activity', { code: 'ALREADY_CHECKED_OUT' });
  return serializeAttendance(updated, activity);
}

// The QR for the admin's screen. Only an OPEN activity inside its attendance window
// gets one, so a code never circulates for attendance that cannot be recorded.
async function getQr(activityId, { now = new Date() } = {}) {
  const activity = await Activity.findById(activityId).select('+qrSecret');
  if (!activity) throw notFound();
  if (activity.status === 'DRAFT') {
    throw new AppError(409, 'Open the activity before showing its QR code', { code: 'ACTIVITY_NOT_OPEN' });
  }
  assertNotClosed(activity);
  if (!attendanceWindow(activity, now).isOpen) {
    throw new AppError(409, 'Attendance is not open for this activity right now', { code: 'ATTENDANCE_WINDOW_CLOSED' });
  }
  return issueQr(activity, now);
}

const LIVE_LIMIT = 200;
const ACTIVITY_FIELDS = 'title category locationName startsAt endsAt status radiusMeters';

// Everyone who has checked in to the activity, newest first, up to LIVE_LIMIT
// (v1 does not page this list; the admin's screen polls it).
async function listLive(activityId) {
  const activity = await Activity.findById(activityId);
  if (!activity) throw notFound();

  const [rows, total] = await Promise.all([
    Attendance.find({ activity: activity._id })
      .sort({ checkedInAt: -1, _id: -1 })
      .limit(LIVE_LIMIT)
      .populate('volunteer', 'volunteerId name')
      .lean(),
    Attendance.countDocuments({ activity: activity._id }),
  ]);
  return { items: rows.map((row) => serializeAttendance(row, activity, { admin: true, volunteer: row.volunteer })), total };
}

// Validates and re-encodes each file (never trusting its declared type), then
// writes it to storage under a random key. If any file in the batch fails —
// processing or the write itself — every file this call already wrote is removed,
// so a partial batch never leaves orphaned files behind.
async function storePhotos(files) {
  const saved = [];
  try {
    for (const file of files) {
      const { buffer, mimeType, ext } = await processImage(file.buffer);
      const key = await storage.save(buffer, ext);
      saved.push({ key, mimeType, size: buffer.length, originalName: file.originalname.slice(0, 255) });
    }
    return saved;
  } catch (error) {
    await Promise.all(saved.map((photo) => storage.remove(photo.key)));
    throw error;
  }
}

// Records a completion with documentation (photos + description + location).
// Volunteers scan QR after completing the activity and submit proof.
// The system auto-credits the activity's creditHours.
async function completeActivity(user, activityId, input, files = [], { now = new Date() } = {}) {
  if (files.length === 0) {
    throw new AppError(400, 'At least one photo is required as documentation', { code: 'VALIDATION_ERROR' });
  }
  if (files.length > PHOTO.maxCount) {
    throw new AppError(400, `Documentation may have at most ${PHOTO.maxCount} photos`, { code: 'TOO_MANY_PHOTOS' });
  }

  const activity = await Activity.findById(activityId).select('+qrSecret');
  assertVisible(activity);
  assertNotClosed(activity);

  // Verify the QR token
  verifyToken(activity, input.token, now);

  // Assess location
  const locationEvidence = assessLocation(activity, input);

  // Store photos
  const photos = await storePhotos(files);

  // Check if already completed
  const existing = await Attendance.findOne({ activity: activity._id, volunteer: user.volunteer });
  if (existing && existing.documentation) {
    // Cleanup photos if already completed
    await Promise.all(photos.map((photo) => storage.remove(photo.key)));
    throw new AppError(409, 'You have already completed this activity', { code: 'ALREADY_COMPLETED' });
  }

  try {
    // If attendance record exists, update it; otherwise create new one
    const attendance = await Attendance.findOneAndUpdate(
      { activity: activity._id, volunteer: user.volunteer },
      {
        $set: {
          documentation: {
            description: input.description,
            photos,
            locationEvidence,
          },
          creditHours: activity.creditHours,
          autoApproved: true,
          completedAt: now,
          // Set check-in if not already set
          checkedInAt: existing?.checkedInAt || now,
          checkIn: existing?.checkIn || locationEvidence,
        },
      },
      { upsert: true, new: true }
    );

    // Link donation to activity if this is the first completion
    if (activity.linkedDonations && activity.linkedDonations.length > 0) {
      await Activity.findByIdAndUpdate(activity._id, {
        $set: { linkedDonations: activity.linkedDonations },
      });
    }

    return serializeAttendance(attendance, activity);
  } catch (error) {
    // Cleanup photos on error
    await Promise.all(photos.map((photo) => storage.remove(photo.key)));
    if (error.code === 11000) {
      throw new AppError(409, 'You have already completed this activity', { code: 'ALREADY_COMPLETED' });
    }
    throw error;
  }
}

// Attendance history, newest first. A volunteer always gets their own records and
// nothing else; an admin gets everyone's and may narrow by activity or volunteer.
async function listHistory(user, { page, limit, activity, volunteer }) {
  const admin = user.role === 'ADMIN';
  const filter = admin ? {} : { volunteer: user.volunteer };
  if (activity) filter.activity = activity;
  if (admin && volunteer) filter.volunteer = volunteer;

  const query = Attendance.find(filter)
    .sort({ checkedInAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('activity', ACTIVITY_FIELDS);
  const [rows, total] = await Promise.all([(admin ? query.populate('volunteer', 'volunteerId name') : query).lean(), Attendance.countDocuments(filter)]);

  return {
    items: rows.map((row) => serializeAttendance(row, row.activity, { admin, volunteer: admin ? row.volunteer : null })),
    page,
    limit,
    total,
  };
}

module.exports = { checkIn, checkOut, completeActivity, assessLocation, getQr, listLive, listHistory, LIVE_LIMIT };
