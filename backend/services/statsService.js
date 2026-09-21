const { Attendance } = require('../models');

// Derived statistics, always computed from authoritative records and never stored.
//
// activitiesAttended is the number of Attendance records. Contributions do not exist
// yet (they arrive with the contribution phase), so nothing can be verified; the
// response shape is fixed now so clients do not change when that aggregation lands.
async function getVolunteerStats(volunteerId) {
  const activitiesAttended = await Attendance.countDocuments({ volunteer: volunteerId });
  return { activitiesAttended, verifiedActivities: 0, verifiedHours: 0 };
}

module.exports = { getVolunteerStats };
