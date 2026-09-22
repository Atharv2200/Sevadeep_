// A hint for the admin only, never the approved value. Without a check-out there
// is no duration to suggest.
function suggestedHours(attendance) {
  if (!attendance?.checkedInAt || !attendance?.checkedOutAt) return null;
  const hours = (attendance.checkedOutAt - attendance.checkedInAt) / 3_600_000;
  return Math.round(hours * 100) / 100;
}

module.exports = { suggestedHours };
