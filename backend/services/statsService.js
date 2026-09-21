// Derived statistics, always computed from authoritative records and never stored.
//
// Attendance and Contribution do not exist yet (they arrive with the attendance and
// contribution phases), so nothing can have been attended or verified. The response
// shape is fixed now so clients do not change when the real aggregations replace this.
async function getVolunteerStats(volunteerId) {
  return { activitiesAttended: 0, verifiedActivities: 0, verifiedHours: 0 };
}

module.exports = { getVolunteerStats };
