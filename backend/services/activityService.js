const mongoose = require('mongoose');
const { Activity } = require('../models');
const { TRANSITIONS, EDITABLE_STATUSES } = require('../config/activity');
const { timeErrors } = require('../validators/activity');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { serializeActivity } = require('../utils/serializers');

// Mongoose neutralises operator objects in filters (sanitizeFilter). Operators built
// here from constants, never from request input, are marked trusted.
const { trusted } = mongoose;

const isAdmin = (user) => user.role === 'ADMIN';

function notFound() {
  return new AppError(404, 'Activity not found', { code: 'NOT_FOUND' });
}

// Admin responses name the creator; the populate is a single extra query per page.
const withCreator = (query) => query.populate('createdBy', 'name');

// Volunteers browse OPEN activities that have not ended yet, soonest first.
// Admins see every status, newest first.
async function listActivities(user, { page, limit, status, category, search }) {
  const admin = isAdmin(user);
  const now = new Date();

  const filter = admin ? {} : { status: 'OPEN', endsAt: trusted({ $gte: now }) };
  if (admin && status) filter.status = status;
  if (category) filter.category = category;
  if (search) filter.title = new RegExp(escapeRegex(search), 'i');

  const sort = admin ? { startsAt: -1, _id: -1 } : { startsAt: 1, _id: 1 };
  const query = Activity.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);

  const [items, total] = await Promise.all([
    (admin ? withCreator(query) : query).lean(),
    Activity.countDocuments(filter),
  ]);

  return { items: items.map((item) => serializeActivity(item, { admin, now })), page, limit, total };
}

// Volunteers can open any activity that has left DRAFT (an old link to a closed or
// cancelled activity still explains itself); DRAFT does not exist for them.
async function getActivity(user, id) {
  const admin = isAdmin(user);
  const query = Activity.findById(id);
  const activity = await (admin ? withCreator(query) : query);
  if (!activity || (!admin && activity.status === 'DRAFT')) throw notFound();
  return serializeActivity(activity, { admin });
}

// The server owns status, createdBy, the QR secret and timestamps.
async function createActivity(user, input) {
  const activity = await Activity.create({ ...input, status: 'DRAFT', createdBy: user._id });
  return getActivity(user, activity._id);
}

function validationError(errors) {
  return new AppError(400, 'Validation failed', { code: 'VALIDATION_ERROR', errors });
}

const LOCATION_FIELDS = ['latitude', 'longitude', 'radiusMeters'];

function locationLocked() {
  return new AppError(409, 'The location and radius cannot be changed once volunteers have checked in', {
    code: 'ACTIVITY_LOCATION_LOCKED',
  });
}

// Edits content of a DRAFT or OPEN activity. The start/end pair is re-checked
// against the stored value when only one of them is sent. Once attendance has been
// recorded (locationLocked, set by the check-in that first recorded it) latitude,
// longitude and radiusMeters cannot change; re-sending the current values is fine.
async function updateActivity(user, id, changes) {
  const current = await Activity.findById(id);
  if (!current) throw notFound();
  if (!EDITABLE_STATUSES.includes(current.status)) {
    throw new AppError(409, `A ${current.status.toLowerCase()} activity can no longer be edited`, { code: 'ACTIVITY_LOCKED' });
  }

  const movesLocation = LOCATION_FIELDS.some((field) => field in changes && changes[field] !== current[field]);
  if (movesLocation && current.locationLocked) throw locationLocked();

  const startsAt = changes.startsAt ?? current.startsAt;
  const endsAt = changes.endsAt ?? current.endsAt;
  const errors = timeErrors(startsAt, endsAt);
  if (errors.length === 0 && current.status === 'OPEN' && changes.endsAt && endsAt <= new Date()) {
    errors.push({ path: 'body.endsAt', message: 'An open activity must end in the future' });
  }
  if (errors.length > 0) throw validationError(errors);

  // A location change also requires that no check-in has locked it since the read above:
  // check-in sets the lock before it records attendance, so one of the two always loses.
  const filter = { _id: id, status: trusted({ $in: EDITABLE_STATUSES }) };
  if (movesLocation) filter.locationLocked = trusted({ $ne: true });

  const updated = await Activity.findOneAndUpdate(filter, { $set: changes }, { new: true, runValidators: true });
  if (!updated) {
    // Lost a race: locked by a check-in, or closed or cancelled by another admin.
    const latest = await Activity.findById(id);
    if (latest && movesLocation && latest.locationLocked) throw locationLocked();
    throw new AppError(409, 'This activity can no longer be edited', { code: 'ACTIVITY_LOCKED' });
  }
  return getActivity(user, id);
}

// Moves an activity along the transition table. The write is conditional on the
// status that was checked, so two admins acting at once cannot both succeed.
async function changeStatus(user, id, next) {
  const current = await Activity.findById(id);
  if (!current) throw notFound();

  if (!TRANSITIONS[current.status].includes(next)) {
    throw new AppError(409, `An activity cannot go from ${current.status} to ${next}`, { code: 'INVALID_STATUS_TRANSITION' });
  }
  if (next === 'OPEN' && current.endsAt <= new Date()) {
    throw new AppError(409, 'An activity that has already ended cannot be opened', { code: 'ACTIVITY_ALREADY_ENDED' });
  }

  const updated = await Activity.findOneAndUpdate({ _id: id, status: current.status }, { $set: { status: next } }, { new: true });
  if (!updated) {
    throw new AppError(409, 'The activity status changed in the meantime. Reload and try again.', { code: 'INVALID_STATUS_TRANSITION' });
  }
  return getActivity(user, id);
}

module.exports = { listActivities, getActivity, createActivity, updateActivity, changeStatus };
