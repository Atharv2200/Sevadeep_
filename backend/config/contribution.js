// Contribution rules shared by the model, the validators and the service.

const STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

const HOURS_STEP = 0.25;
const MAX_HOURS = 24;

const LIMITS = {
  description: { max: 5000 },
  reviewNote: { max: 2000 },
};

// Content is validated against the decoded image, never the client's extension or
// declared MIME type. Dimensions are capped after auto-orienting from EXIF, which
// is then stripped along with every other metadata block (GPS included).
const PHOTO = {
  maxCount: 5,
  maxBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxDimension: 2000,
};

module.exports = { STATUSES, HOURS_STEP, MAX_HOURS, LIMITS, PHOTO };
