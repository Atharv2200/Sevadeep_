const mongoose = require('mongoose');
const { Activity, Attendance, Contribution, User } = require('../models');

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

// Groups an aggregate's { _id: status, count } rows into { STATUS: count }.
function countsByStatus(rows) {
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

// A platform-wide summary for the admin overview, entirely derived from the
// same authoritative records as getVolunteerStats: nothing here is a persisted
// counter. Zero-data and every status is accounted for even when a group never
// occurs (e.g. no REJECTED contributions yet).
async function getAdminStats() {
  const [volunteerRows, activityRows, attendanceTotal, contributionRows] = await Promise.all([
    User.aggregate([{ $match: { role: 'VOLUNTEER' } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Activity.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Attendance.countDocuments({}),
    Contribution.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, hours: { $sum: '$approvedHours' } } },
    ]),
  ]);

  const volunteersByStatus = countsByStatus(volunteerRows);
  const activitiesByStatus = countsByStatus(activityRows);
  const contributionsByStatus = countsByStatus(contributionRows);
  const verifiedHours = contributionRows.find((row) => row._id === 'VERIFIED')?.hours ?? 0;

  return {
    volunteers: {
      total: Object.values(volunteersByStatus).reduce((sum, count) => sum + count, 0),
      active: volunteersByStatus.ACTIVE ?? 0,
      suspended: volunteersByStatus.SUSPENDED ?? 0,
    },
    activities: {
      total: Object.values(activitiesByStatus).reduce((sum, count) => sum + count, 0),
      draft: activitiesByStatus.DRAFT ?? 0,
      open: activitiesByStatus.OPEN ?? 0,
      closed: activitiesByStatus.CLOSED ?? 0,
      cancelled: activitiesByStatus.CANCELLED ?? 0,
    },
    attendance: {
      total: attendanceTotal,
    },
    contributions: {
      pending: contributionsByStatus.PENDING ?? 0,
      verified: contributionsByStatus.VERIFIED ?? 0,
      rejected: contributionsByStatus.REJECTED ?? 0,
      verifiedHours: Math.round(verifiedHours * 100) / 100,
    },
  };
}

module.exports = { getVolunteerStats, getAdminStats };
