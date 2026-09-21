const { TRANSITIONS } = require('../config/activity');
const { attendanceWindow } = require('./attendanceWindow');
const { attendanceFlags } = require('./attendanceFlags');

// Explicit response shapes. Fields are listed one by one, so a column added to a
// model later is never exposed to clients by accident.

function serializeVolunteer(volunteer) {
  return {
    id: String(volunteer._id),
    volunteerId: volunteer.volunteerId,
    name: volunteer.name,
    phone: volunteer.phone,
    joinedAt: volunteer.createdAt,
  };
}

// `volunteer` is the loaded profile for VOLUNTEER users and null for admins.
function serializeUser(user, volunteer = null) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name ?? volunteer?.name ?? null,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt ?? null,
    volunteer: volunteer ? serializeVolunteer(volunteer) : null,
  };
}

// A volunteer as an admin sees them: profile plus the account's email and status.
function serializeVolunteerAccount(volunteer, user) {
  return {
    ...serializeVolunteer(volunteer),
    email: user.email,
    status: user.status,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

// An activity as either audience sees it. `qrSecret` is never listed here. The
// attendance window is computed by the server so clients never derive it.
// Admins additionally get the creator, the per-activity window settings and the
// status changes currently allowed (so the client does not copy the transition table).
function serializeActivity(activity, { admin = false, now = new Date() } = {}) {
  const view = {
    id: String(activity._id),
    title: activity.title,
    description: activity.description,
    category: activity.category,
    status: activity.status,
    startsAt: activity.startsAt,
    endsAt: activity.endsAt,
    locationName: activity.locationName,
    address: activity.address,
    latitude: activity.latitude,
    longitude: activity.longitude,
    radiusMeters: activity.radiusMeters,
    instructions: activity.instructions,
    attendance: attendanceWindow(activity, now),
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
  if (!admin) return view;

  const creator = activity.createdBy;
  return {
    ...view,
    attendanceOpensMinutesBefore: activity.attendanceOpensMinutesBefore,
    attendanceClosesMinutesAfter: activity.attendanceClosesMinutesAfter,
    createdBy: creator?._id ? { id: String(creator._id), name: creator.name ?? null } : { id: String(creator), name: null },
    allowedTransitions: TRANSITIONS[activity.status],
    locationLocked: Boolean(activity.locationLocked),
  };
}

const serializeEvidence = (evidence) =>
  evidence
    ? { latitude: evidence.latitude, longitude: evidence.longitude, accuracy: evidence.accuracy, distanceMeters: evidence.distanceMeters }
    : null;

// An attendance record. `activity` is the loaded activity (a summary is embedded).
// The volunteer's own view carries times and duration only: coordinates, distance,
// accuracy and flags are evidence for admins, who additionally see who attended.
// `volunteer` (admin view) is the loaded Volunteer profile.
function serializeAttendance(attendance, activity, { admin = false, volunteer = null } = {}) {
  const view = {
    id: String(attendance._id),
    checkedInAt: attendance.checkedInAt,
    checkedOutAt: attendance.checkedOutAt ?? null,
    durationMinutes: attendance.checkedOutAt ? Math.round((attendance.checkedOutAt - attendance.checkedInAt) / 60000) : null,
    activity: {
      id: String(activity._id),
      title: activity.title,
      category: activity.category,
      locationName: activity.locationName,
      startsAt: activity.startsAt,
      endsAt: activity.endsAt,
      status: activity.status,
    },
  };
  if (!admin) return view;

  return {
    ...view,
    volunteer: volunteer
      ? { id: String(volunteer._id), volunteerId: volunteer.volunteerId, name: volunteer.name }
      : { id: String(attendance.volunteer), volunteerId: null, name: null },
    checkIn: serializeEvidence(attendance.checkIn),
    checkOut: serializeEvidence(attendance.checkOut),
    flags: attendanceFlags(attendance, activity),
  };
}

module.exports = { serializeAttendance, serializeActivity, serializeVolunteer, serializeVolunteerAccount, serializeUser };
