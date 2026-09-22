const { Attendance, Contribution } = require('../models');
const AppError = require('../utils/AppError');
const { serializeContribution } = require('../utils/serializers');
const storage = require('./storage');
const { processImage } = require('./imageProcessing');
const { PHOTO } = require('../config/contribution');

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

function tooManyPhotos() {
  return new AppError(400, `A contribution may have at most ${PHOTO.maxCount} photos`, { code: 'TOO_MANY_PHOTOS' });
}

function noPhotosGiven() {
  return new AppError(400, 'At least one photo is required', { code: 'VALIDATION_ERROR' });
}

function photoNotFound() {
  return new AppError(404, 'Photo not found', { code: 'NOT_FOUND' });
}

function withSummaries(query, { admin }) {
  const populated = query.populate('activity', ACTIVITY_SUMMARY).populate('attendance', ATTENDANCE_SUMMARY);
  return admin ? populated.populate('volunteer', 'volunteerId name') : populated;
}

// Validates and re-encodes each file (never trusting its declared type), then
// writes it to storage under a random key. If any file in the batch fails —
// processing or the write itself — every file this call already wrote is removed,
// so a partial batch never leaves orphaned files behind.
async function storePhotos(files) {
  const saved = [];
  try {
    for (const file of files) {
      const { buffer, mimeType, ext } = await processImage(file.buffer);
      const key = await storage.save(buffer, ext);
      saved.push({ key, mimeType, size: buffer.length, originalName: file.originalname.slice(0, 255) });
    }
    return saved;
  } catch (error) {
    await Promise.all(saved.map((photo) => storage.remove(photo.key)));
    throw error;
  }
}

// A volunteer may report on their own attendance only, and at most once per
// attendance (the unique index is the final word on the second half of that).
async function createContribution(user, { attendance: attendanceId, description }, files = []) {
  if (files.length > PHOTO.maxCount) throw tooManyPhotos();
  const attendance = await Attendance.findOne({ _id: attendanceId, volunteer: user.volunteer });
  if (!attendance) throw attendanceNotFound();

  const photos = await storePhotos(files);
  try {
    const contribution = await Contribution.create({
      attendance: attendance._id,
      volunteer: user.volunteer,
      activity: attendance.activity,
      description,
      photos,
    });
    return getContribution(user, contribution._id);
  } catch (error) {
    await Promise.all(photos.map((photo) => storage.remove(photo.key)));
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

// Adds photos to the caller's own PENDING contribution, bumping the revision like
// any other edit does. Conditional on PENDING for the same reason as description
// edits: a review landing at the same moment always wins.
async function addPhotos(user, id, files) {
  if (!files || files.length === 0) throw noPhotosGiven();
  const current = await Contribution.findById(id);
  if (!current) throw notFound();
  if (String(current.volunteer) !== String(user.volunteer)) throw notFound();
  if (current.status !== 'PENDING') throw locked();
  if (current.photos.length + files.length > PHOTO.maxCount) throw tooManyPhotos();

  const photos = await storePhotos(files);
  const updated = await Contribution.findOneAndUpdate(
    { _id: id, volunteer: user.volunteer, status: 'PENDING' },
    { $push: { photos: { $each: photos } }, $inc: { revision: 1 } },
    { new: true }
  );
  if (!updated) {
    await Promise.all(photos.map((photo) => storage.remove(photo.key)));
    throw locked();
  }
  return getContribution(user, id);
}

// Removes one photo from the caller's own PENDING contribution.
async function removePhoto(user, id, photoId) {
  const current = await Contribution.findById(id);
  if (!current) throw notFound();
  if (String(current.volunteer) !== String(user.volunteer)) throw notFound();
  if (current.status !== 'PENDING') throw locked();
  const photo = current.photos.id(photoId);
  if (!photo) throw photoNotFound();

  const updated = await Contribution.findOneAndUpdate(
    { _id: id, volunteer: user.volunteer, status: 'PENDING' },
    { $pull: { photos: { _id: photoId } }, $inc: { revision: 1 } },
    { new: true }
  );
  if (!updated) throw locked();
  await storage.remove(photo.key);
  return getContribution(user, id);
}

// The owner or an admin may read a photo's bytes; anyone else gets the same 404 a
// resource owned by someone else always gets.
async function getPhoto(user, id, photoId) {
  const admin = isAdmin(user);
  const contribution = await Contribution.findById(id);
  if (!contribution) throw notFound();
  if (!admin && String(contribution.volunteer) !== String(user.volunteer)) throw notFound();
  const photo = contribution.photos.id(photoId);
  if (!photo) throw photoNotFound();

  const buffer = await storage.read(photo.key);
  return { buffer, mimeType: photo.mimeType };
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

module.exports = {
  createContribution,
  getContribution,
  listContributions,
  updateContribution,
  reviewContribution,
  addPhotos,
  removePhoto,
  getPhoto,
};
