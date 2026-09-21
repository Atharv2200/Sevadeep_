const { User, Volunteer } = require('../models');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { serializeVolunteerAccount } = require('../utils/serializers');

function notFound() {
  return new AppError(404, 'Volunteer not found', { code: 'NOT_FOUND' });
}

async function accountFor(volunteer) {
  const user = await User.findOne({ volunteer: volunteer._id });
  if (!user) throw notFound();
  return serializeVolunteerAccount(volunteer, user);
}

// Volunteers with their account details, newest first. Email and status live on
// User, hence the join; search text is escaped and matched literally.
async function listVolunteers({ page, limit, search, status }) {
  const match = {};
  if (status) match['account.status'] = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    match.$or = [{ name: pattern }, { volunteerId: pattern }, { 'account.email': pattern }];
  }

  const [result] = await Volunteer.aggregate([
    { $lookup: { from: User.collection.name, localField: '_id', foreignField: 'volunteer', as: 'account' } },
    { $unwind: '$account' },
    ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  return {
    items: result.items.map((row) => serializeVolunteerAccount(row, row.account)),
    page,
    limit,
    total: result.total[0]?.count ?? 0,
  };
}

async function getVolunteer(id) {
  const volunteer = await Volunteer.findById(id);
  if (!volunteer) throw notFound();
  return accountFor(volunteer);
}

// Suspending blocks the account from authenticating and from acting; the volunteer
// profile and all historical records stay exactly as they were.
async function setVolunteerStatus(id, status) {
  const volunteer = await Volunteer.findById(id);
  if (!volunteer) throw notFound();
  const user = await User.findOneAndUpdate({ volunteer: volunteer._id }, { $set: { status } }, { new: true });
  if (!user) throw notFound();
  return serializeVolunteerAccount(volunteer, user);
}

// Only the fields the caller passed are written; the schema validates them again.
async function updateProfile(volunteerId, changes) {
  const volunteer = await Volunteer.findOneAndUpdate(
    { _id: volunteerId },
    { $set: changes },
    { new: true, runValidators: true }
  );
  if (!volunteer) throw notFound();
  return volunteer;
}

module.exports = { listVolunteers, getVolunteer, setVolunteerStatus, updateProfile };
