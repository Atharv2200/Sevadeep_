const mongoose = require('mongoose');
const { Attendance, Contribution } = require('../models');

// Derived statistics, always computed from authoritative records and never stored.
//
// activitiesAttended is the number of Attendance records. verifiedActivities and
// verifiedHours count only VERIFIED Contributions; a REJECTED one contributes
// nothing to either.
async function getVolunteerStats(volunteerId) {
  const volunteer = new mongoose.Types.ObjectId(String(volunteerId));

  const [activitiesAttended, verifiedAgg] = await Promise.all([
    Attendance.countDocuments({ volunteer }),
    Contribution.aggregate([
      { $match: { volunteer, status: 'VERIFIED' } },
      { $group: { _id: null, verifiedActivities: { $sum: 1 }, verifiedHours: { $sum: '$approvedHours' } } },
    ]),
  ]);
  const verified = verifiedAgg[0];

  return {
    activitiesAttended,
    verifiedActivities: verified?.verifiedActivities ?? 0,
    verifiedHours: verified ? Math.round(verified.verifiedHours * 100) / 100 : 0,
  };
}

module.exports = { getVolunteerStats };
