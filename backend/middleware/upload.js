const multer = require('multer');
const AppError = require('../utils/AppError');
const { PHOTO } = require('../config/contribution');

// Memory storage: files stay in RAM only long enough to be validated and
// re-encoded by imageProcessing.js, never written to disk under a client name.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO.maxBytes, files: PHOTO.maxCount },
});

// Never forwards a raw multer/busboy error: it may describe internals the client
// has no business seeing.
function translateError(err) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError(413, `Each photo must be at most ${Math.round(PHOTO.maxBytes / (1024 * 1024))} MB`, {
        code: 'PHOTO_TOO_LARGE',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError(400, `At most ${PHOTO.maxCount} photos are allowed`, { code: 'TOO_MANY_PHOTOS' });
    }
  }
  return new AppError(400, 'Invalid photo upload', { code: 'VALIDATION_ERROR' });
}

const parsePhotos = upload.array('photos', PHOTO.maxCount);

// Parses the `photos` field of a multipart request into req.files. A JSON request
// is left untouched, so creating or editing a contribution with no photos keeps
// working exactly as before.
function photosUpload(req, res, next) {
  if (!req.is('multipart/form-data')) return next();
  parsePhotos(req, res, (err) => (err ? next(translateError(err)) : next()));
}

// For routes whose only purpose is to carry photos, multipart is mandatory.
function requirePhotosUpload(req, res, next) {
  parsePhotos(req, res, (err) => (err ? next(translateError(err)) : next()));
}

module.exports = { photosUpload, requirePhotosUpload };
