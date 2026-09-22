const sharp = require('sharp');
const AppError = require('../utils/AppError');
const { PHOTO } = require('../config/contribution');

// What a photo is re-encoded to, keyed by the format sharp actually decoded (never
// the client's declared MIME type or filename extension). SVG and anything else
// decode successfully but have no entry here, so they fall through to "unsupported".
const ENCODERS = {
  jpeg: { ext: '.jpg', mimeType: 'image/jpeg', encode: (image) => image.jpeg({ quality: 85 }) },
  png: { ext: '.png', mimeType: 'image/png', encode: (image) => image.png({ compressionLevel: 8 }) },
  webp: { ext: '.webp', mimeType: 'image/webp', encode: (image) => image.webp({ quality: 85 }) },
};

function invalidImage() {
  return new AppError(400, 'One of the uploaded files is not a valid image', { code: 'INVALID_IMAGE' });
}

function unsupportedType() {
  return new AppError(400, 'Only JPEG, PNG and WebP images are allowed', { code: 'UNSUPPORTED_IMAGE_TYPE' });
}

// Confirms `buffer` really decodes as an allowed image format, then re-encodes it:
// auto-oriented from EXIF, capped to PHOTO.maxDimension on the longest side, and
// with every metadata block (EXIF/GPS/ICC included) dropped — sharp only keeps
// metadata when withMetadata() is called, which this deliberately never does.
async function processImage(buffer) {
  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw invalidImage();
  }

  const encoder = ENCODERS[metadata.format];
  if (!encoder) throw unsupportedType();

  try {
    const image = sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: PHOTO.maxDimension, height: PHOTO.maxDimension, fit: 'inside', withoutEnlargement: true });
    const output = await encoder.encode(image).toBuffer();
    return { buffer: output, mimeType: encoder.mimeType, ext: encoder.ext };
  } catch {
    throw invalidImage();
  }
}

module.exports = { processImage };
