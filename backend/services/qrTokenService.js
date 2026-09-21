const crypto = require('crypto');
const { publicAppUrl } = require('../config/env');
const { Activity } = require('../models');
const AppError = require('../utils/AppError');

// Attendance QR tokens: a compact HMAC, not a JWT, so the QR stays small enough to
// scan from a projector.
//
//   token  = <bucket>.<mac>
//   bucket = floor(unix seconds / 60)
//   mac    = base64url(first 16 bytes of HMAC-SHA256(activity.qrSecret, "<activityId>.<bucket>"))
//
// The QR on screen changes every minute. A token minted in bucket k is accepted while
// the current bucket is k .. k+4, so a scanned or photographed code stops working
// 4-5 minutes after it was shown. Replacing the activity's qrSecret invalidates every
// outstanding token at once. Everything here runs on the server.

const BUCKET_SECONDS = 60;
const VALID_BUCKETS = 5;
const BUCKET_MS = BUCKET_SECONDS * 1000;
const MAC_BYTES = 16;
const TOKEN_FORMAT = /^(\d{1,12})\.([A-Za-z0-9_-]{22})$/;

const bucketAt = (now) => Math.floor(now.getTime() / BUCKET_MS);

function mac(activity, bucket) {
  return crypto
    .createHmac('sha256', activity.qrSecret)
    .update(`${activity._id}.${bucket}`)
    .digest()
    .subarray(0, MAC_BYTES)
    .toString('base64url');
}

// `activity` must have been loaded with qrSecret selected.
function createToken(activity, now = new Date()) {
  const bucket = bucketAt(now);
  return `${bucket}.${mac(activity, bucket)}`;
}

// What the admin's screen renders: the attendance URL (built from PUBLIC_APP_URL),
// when this code stops being accepted, and when the screen should ask for a new one.
function issueQr(activity, now = new Date()) {
  const bucket = bucketAt(now);
  const token = createToken(activity, now);
  return {
    url: `${publicAppUrl}/attend/${activity._id}?t=${token}`,
    expiresAt: new Date((bucket + VALID_BUCKETS) * BUCKET_MS),
    refreshInSeconds: Math.max(1, Math.ceil(((bucket + 1) * BUCKET_MS - now.getTime()) / 1000)),
  };
}

const invalid = () => new AppError(403, 'This QR code is not valid. Scan the code shown at the venue.', { code: 'INVALID_QR' });

// Throws INVALID_QR for anything malformed, forged, from another activity or from the
// future, and QR_EXPIRED for a genuine token that has aged out. Expiry is only reported
// once the signature checks out, so it cannot be used to probe for valid signatures.
function verifyToken(activity, token, now = new Date()) {
  const match = typeof token === 'string' ? TOKEN_FORMAT.exec(token) : null;
  if (!match) throw invalid();

  const bucket = Number(match[1]);
  if (bucket > bucketAt(now)) throw invalid();

  const given = Buffer.from(match[2]);
  const expected = Buffer.from(mac(activity, bucket));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw invalid();

  if (bucket <= bucketAt(now) - VALID_BUCKETS) {
    throw new AppError(403, 'This QR code has expired. Scan the code shown at the venue again.', { code: 'QR_EXPIRED' });
  }
}

// Gives the activity a fresh secret, so every token issued so far stops verifying.
async function regenerateSecret(activityId) {
  const result = await Activity.updateOne({ _id: activityId }, { $set: { qrSecret: Activity.generateQrSecret() } });
  return result.matchedCount === 1;
}

module.exports = { BUCKET_SECONDS, VALID_BUCKETS, createToken, issueQr, verifyToken, regenerateSecret };
