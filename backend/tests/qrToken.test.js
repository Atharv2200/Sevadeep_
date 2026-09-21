const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { Activity } = require('../models');
const qr = require('../services/qrTokenService');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const MINUTE = 60 * 1000;
const NOW = new Date('2031-05-01T09:00:30.000Z');
const later = (minutes, base = NOW) => new Date(base.getTime() + minutes * MINUTE);
const activity = (overrides = {}) => ({ _id: '507f1f77bcf86cd799439011', qrSecret: 'a'.repeat(64), ...overrides });

const codeOf = (fn) => {
  try {
    fn();
  } catch (error) {
    return error.code;
  }
  return null;
};

describe('QR token', () => {
  it('is compact: <bucket>.<22 base64url characters>', () => {
    const token = qr.createToken(activity(), NOW);
    assert.match(token, /^\d+\.[A-Za-z0-9_-]{22}$/);
    assert.ok(token.length < 40);
  });

  it('is the same within a minute and changes every minute', () => {
    const a = activity();
    assert.equal(qr.createToken(a, NOW), qr.createToken(a, later(0.4)));
    assert.notEqual(qr.createToken(a, NOW), qr.createToken(a, later(1)));
  });

  it('verifies while current', () => {
    const a = activity();
    assert.equal(codeOf(() => qr.verifyToken(a, qr.createToken(a, NOW), NOW)), null);
  });

  it('verifies for 4-5 minutes, then expires', () => {
    const a = activity();
    const token = qr.createToken(a, NOW); // bucket k
    for (const minutes of [1, 2, 3, 4]) {
      assert.equal(codeOf(() => qr.verifyToken(a, token, later(minutes))), null, `+${minutes} min`);
    }
    // The last instant of bucket k+4 is still accepted; the first of k+5 is not.
    const bucketEnd = new Date(Math.floor(NOW.getTime() / MINUTE) * MINUTE + 5 * MINUTE);
    assert.equal(codeOf(() => qr.verifyToken(a, token, later(0, new Date(bucketEnd.getTime() - 1)))), null);
    assert.equal(codeOf(() => qr.verifyToken(a, token, bucketEnd)), 'QR_EXPIRED');
    assert.equal(codeOf(() => qr.verifyToken(a, token, later(30))), 'QR_EXPIRED');
  });

  it('rejects a token from the future', () => {
    const a = activity();
    assert.equal(codeOf(() => qr.verifyToken(a, qr.createToken(a, later(5)), NOW)), 'INVALID_QR');
  });

  it('rejects a token issued for another activity', () => {
    const token = qr.createToken(activity({ _id: '507f1f77bcf86cd799439012' }), NOW);
    assert.equal(codeOf(() => qr.verifyToken(activity(), token, NOW)), 'INVALID_QR');
  });

  it('rejects a token signed with another secret', () => {
    const token = qr.createToken(activity({ qrSecret: 'b'.repeat(64) }), NOW);
    assert.equal(codeOf(() => qr.verifyToken(activity(), token, NOW)), 'INVALID_QR');
  });

  it('rejects tampered, malformed and non-string tokens', () => {
    const a = activity();
    const [bucket, mac] = qr.createToken(a, NOW).split('.');
    const flipped = `${mac.slice(0, -1)}${mac.endsWith('A') ? 'B' : 'A'}`;
    for (const token of [
      `${bucket}.${flipped}`,
      `${Number(bucket) - 1}.${mac}`, // real MAC, different bucket
      `${bucket}.`,
      `.${mac}`,
      bucket,
      mac,
      `${bucket}.${mac}extra`,
      `${bucket}.${mac.slice(1)}`,
      '',
      'null',
      `${'9'.repeat(20)}.${mac}`,
      undefined,
      null,
      42,
      { bucket, mac },
    ]) {
      assert.equal(codeOf(() => qr.verifyToken(a, token, NOW)), 'INVALID_QR', String(token));
    }
  });

  it('does not report expiry for a forged old token', () => {
    const a = activity();
    const oldBucket = Math.floor(NOW.getTime() / MINUTE) - 30;
    assert.equal(codeOf(() => qr.verifyToken(a, `${oldBucket}.${'A'.repeat(22)}`, NOW)), 'INVALID_QR');
  });
});

describe('issueQr', () => {
  it('builds the attendance URL from PUBLIC_APP_URL', () => {
    const a = activity();
    const issued = qr.issueQr(a, NOW);
    assert.equal(issued.url, `http://localhost:5173/attend/${a._id}?t=${qr.createToken(a, NOW)}`);
  });

  it('says when the code expires and when to fetch the next one', () => {
    const a = activity();
    // 09:00:30 -> the next bucket starts in 30 s; the code stops working at 09:05:00.
    const issued = qr.issueQr(a, NOW);
    assert.equal(issued.refreshInSeconds, 30);
    assert.equal(issued.expiresAt.toISOString(), '2031-05-01T09:05:00.000Z');
    assert.deepEqual(Object.keys(issued).sort(), ['expiresAt', 'refreshInSeconds', 'url']);
  });

  it('asks for a refresh within 1-60 seconds', () => {
    const a = activity();
    assert.equal(qr.issueQr(a, new Date('2031-05-01T09:00:00.000Z')).refreshInSeconds, 60);
    assert.equal(qr.issueQr(a, new Date('2031-05-01T09:00:59.999Z')).refreshInSeconds, 1);
  });

  it('never carries the secret', () => {
    const a = activity();
    assert.equal(JSON.stringify(qr.issueQr(a, NOW)).includes(a.qrSecret), false);
  });
});

describe('regenerating the secret', () => {
  it('invalidates every token issued before it', async () => {
    const { user } = await f.createAdmin();
    const seeded = await f.seedActivity(user._id);
    const before = await Activity.findById(seeded._id).select('+qrSecret');
    const token = qr.createToken(before);
    assert.equal(codeOf(() => qr.verifyToken(before, token)), null);

    assert.equal(await qr.regenerateSecret(seeded._id), true);

    const after = await Activity.findById(seeded._id).select('+qrSecret');
    assert.notEqual(after.qrSecret, before.qrSecret);
    assert.match(after.qrSecret, /^[0-9a-f]{64}$/);
    assert.equal(codeOf(() => qr.verifyToken(after, token)), 'INVALID_QR');
    assert.equal(codeOf(() => qr.verifyToken(after, qr.createToken(after))), null);
  });

  it('reports an unknown activity', async () => {
    assert.equal(await qr.regenerateSecret('507f1f77bcf86cd799439011'), false);
  });
});
