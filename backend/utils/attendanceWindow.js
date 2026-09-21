const MINUTE_MS = 60 * 1000;

// The attendance window of an activity, always computed by the server:
//   opensAt  = startsAt - attendanceOpensMinutesBefore
//   closesAt = endsAt   + attendanceClosesMinutesAfter
// Attendance is possible while the activity is OPEN and opensAt <= now <= closesAt
// (both ends inclusive). Closing or cancelling an activity ends the window at once.
function attendanceWindow(activity, now = new Date()) {
  const opensAt = new Date(activity.startsAt.getTime() - activity.attendanceOpensMinutesBefore * MINUTE_MS);
  const closesAt = new Date(activity.endsAt.getTime() + activity.attendanceClosesMinutesAfter * MINUTE_MS);
  const isOpen = activity.status === 'OPEN' && now >= opensAt && now <= closesAt;
  return { opensAt, closesAt, isOpen };
}

module.exports = { attendanceWindow };
