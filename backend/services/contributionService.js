const { Attendance, Contribution } = require('../models');
const AppError = require('../utils/AppError');
const { serializeContribution } = require('../utils/serializers');

// Everything ownership- and status-related is decided by the server: which
// attendance a contribution may attach to, who may edit it and when, and who
// may review it. The client only ever supplies a description (volunteer) or a
// verdict and hours (admin).

const ACTIVITY_SUMMARY = 'title category startsAt endsAt';
const ATTENDANCE_SUMMARY = 'checkedInAt checkedOutAt';

const isAdmin = (user) => user.role === 'ADMIN';

function notFound() {
  return new AppError(404, 'Contribution not found', { code: 'NOT_FOUND' });
}

function attendanceNotFound() {
  return new AppError(404, 'Attendance record not found', { code: 'NOT_FOUND' });
}

function locked() {
  return new AppError(409, 'This contribution has already been reviewed and can no longer be edited', {
    code: 'CONTRIBUTION_LOCKED',
  });
}

function alreadyReviewed() {
  return new AppError(409, 'This contribution has already been reviewed', { code: 'CONTRIBUTION_ALREADY_REVIEWED' });
}

function revisionConflict() {
  return new AppError(409, 'This contribution was changed in the meantime. Reload and try again.', {
    code: 'CONTRIBUTION_REVISION_CONFLICT',
  });
}

function withSummaries(query, { admin }) {
  const populated = query.populate('activity', ACTIVITY_SUMMARY).populate('attendance', ATTENDANCE_SUMMARY);
  return admin ? populated.populate('volunteer', 'volunteerId name') : populated;
}

// A volunteer may report on their own attendance only, and at most once per
// attendance (the unique index is the final word on the second half of that).
async function createContribution(user, { attendance: attendanceId, description }) {
  const attendance = await Attendance.findOne({ _id: attendanceId, volunteer: user.volunteer });
  if (!attendance) throw attendanceNotFound();

  try {
    const contribution = await Contribution.create({
      attendance: attendance._id,
      volunteer: user.volunteer,
      activity: attendance.activity,
      description,
    });
    return getContribution(user, contribution._id);
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(409, 'A contribution already exists for this attendance', { code: 'CONTRIBUTION_EXISTS' });
    }
    throw error;
  }
}

// A volunteer sees only their own contributions; an admin sees any. A resource
// owned by someone else is reported as not found, not forbidden.
async function getContribution(user, id) {
  const admin = isAdmin(user);
  const contribution = await withSummaries(Contribution.findById(id), { admin });
  if (!contribution) throw notFound();
  if (!admin && String(contribution.volunteer) !== String(user.volunteer)) throw notFound();
  return serializeContribution(contribution, { admin });
}

async function listContributions(user, { page, limit, activity, status, volunteer }) {
  const admin = isAdmin(user);
  const filter = admin ? {} : { volunteer: user.volunteer };
  if (activity) filter.activity = activity;
  if (status) filter.status = status;
  if (admin && volunteer) filter.volunteer = volunteer;

  const query = withSummaries(
    Contribution.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    { admin }
  );
  const [rows, total] = await Promise.all([query.lean(), Contribution.countDocuments(filter)]);

  return { items: rows.map((row) => serializeContribution(row, { admin })), page, limit, total };
}

// Edits the description of the caller's own PENDING contribution. Conditional on
// PENDING so a review landing at the same moment always wins over an edit.
async function updateContribution(user, id, { description }) {
  const current = await Contribution.findById(id);
  if (!current) throw notFound();
  if (String(current.volunteer) !== String(user.volunteer)) throw notFound();
  if (current.status !== 'PENDING') throw locked();

  const updated = await Contribution.findOneAndUpdate(
    { _id: id, volunteer: user.volunteer, status: 'PENDING' },
    { $set: { description }, $inc: { revision: 1 } },
    { new: true }
  );
  if (!updated) throw locked();
  return getContribution(user, id);
}

// Verifies or rejects a PENDING contribution. The write is conditional on both
// the status and the revision the admin actually reviewed, so a stale review
// (someone else reviewed it, or the volunteer edited it, since it was opened)
// never silently applies.
async function reviewContribution(user, id, { status, approvedHours, note, revision }) {
  const current = await Contribution.findById(id);
  if (!current) throw notFound();
  if (current.status !== 'PENDING') throw alreadyReviewed();
  if (current.revision !== revision) throw revisionConflict();

  const updated = await Contribution.findOneAndUpdate(
    { _id: id, status: 'PENDING', revision },
    {
      $set: {
        status,
        approvedHours: status === 'VERIFIED' ? approvedHours : null,
        review: { reviewedBy: user._id, reviewedAt: new Date(), note: note ?? '' },
      },
      $inc: { revision: 1 },
    },
    { new: true }
  );
  if (!updated) {
    const latest = await Contribution.findById(id);
    if (latest && latest.status !== 'PENDING') throw alreadyReviewed();
    throw revisionConflict();
  }
  return getContribution(user, id);
}

module.exports = { createContribution, getContribution, listContributions, updateContribution, reviewContribution };
