const { maxAccuracyMeters } = require('../config/env');

const NEAR_BOUNDARY_RATIO = 0.8;
const LOW_ACCURACY_RATIO = 0.5;

// Informational markers for an admin reviewing attendance. They are derived from
// the stored evidence whenever the record is read and never reject anything.
//   LOW_ACCURACY   reported accuracy is worse than half of MAX_ACCURACY_METERS
//   NEAR_BOUNDARY  distance is more than 80% of the activity's radius
//   EARLY          checked in before the activity starts
//   LATE           checked in after the activity ends
// The activity's radius cannot change once attendance exists, so NEAR_BOUNDARY is stable.
function attendanceFlags(attendance, activity, { maxAccuracy = maxAccuracyMeters } = {}) {
  const flags = [];
  if (attendance.checkIn.accuracy > maxAccuracy * LOW_ACCURACY_RATIO) flags.push('LOW_ACCURACY');
  if (attendance.checkIn.distanceMeters > activity.radiusMeters * NEAR_BOUNDARY_RATIO) flags.push('NEAR_BOUNDARY');
  if (attendance.checkedInAt < activity.startsAt) flags.push('EARLY');
  if (attendance.checkedInAt > activity.endsAt) flags.push('LATE');
  return flags;
}

module.exports = { attendanceFlags, NEAR_BOUNDARY_RATIO, LOW_ACCURACY_RATIO };
