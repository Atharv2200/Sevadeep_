const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const sharp = require('sharp');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { Attendance, Contribution } = require('../models');
const { uploadDir } = require('../config/env');
const { PHOTO } = require('../config/contribution');

before(db.connect);
after(db.disconnect);
beforeEach(async () => {
  await db.reset();
  await fs.rm(uploadDir, { recursive: true, force: true });
});

const OBJECT_ID = '507f1f77bcf86cd799439011';
const codeOf = (res) => res.body.code;

async function storedFiles() {
  return fs.readdir(uploadDir).catch(() => []);
}

// An admin, an OPEN activity, and a volunteer with a real checked-in Attendance record.
async function attendedScene(activityOverrides = {}) {
  const admin = await f.loggedInAdmin();
  const activity = await f.openActivity(admin.user._id, activityOverrides);
  const volunteer = await f.registerVolunteer();
  const checkIn = await volunteer.agent.post(`/api/activities/${activity._id}/attendance`).send(await f.checkInBody(activity));
  assert.equal(checkIn.status, 201, JSON.stringify(checkIn.body));
  const attendance = await Attendance.findOne({ activity: activity._id, volunteer: volunteer.user.volunteer.id });
  return { admin, activity, volunteer, attendance };
}

function createRequest(volunteer, attendance, { description = 'Helped serve meals to 40 families.' } = {}) {
  return volunteer.agent
    .post('/api/contributions')
    .field('attendance', String(attendance._id))
    .field('description', description);
}

async function pendingContribution(overrides = {}) {
  const scene = await attendedScene(overrides);
  const res = await createRequest(scene.volunteer, scene.attendance);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...scene, contribution: res.body.contribution };
}

async function pendingContributionWithPhoto(overrides = {}) {
  const scene = await attendedScene(overrides);
  const jpeg = await f.jpegBuffer();
  const res = await createRequest(scene.volunteer, scene.attendance)
    .attach('photos', jpeg, { filename: 'shift.jpg', contentType: 'image/jpeg' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...scene, contribution: res.body.contribution };
}

describe('contribution photos: upload validation', () => {
  it('accepts valid JPEG, PNG and WebP photos', async () => {
    const { volunteer, attendance } = await attendedScene();
    const [jpeg, png, webp] = await Promise.all([f.jpegBuffer(), f.pngBuffer(), f.webpBuffer()]);

    const res = await createRequest(volunteer, attendance)
      .attach('photos', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' })
      .attach('photos', png, { filename: 'b.png', contentType: 'image/png' })
      .attach('photos', webp, { filename: 'c.webp', contentType: 'image/webp' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.contribution.photos.length, 3);
    const mimeTypes = res.body.contribution.photos.map((p) => p.mimeType).sort();
    assert.deepEqual(mimeTypes, ['image/jpeg', 'image/png', 'image/webp']);
    assert.equal((await storedFiles()).length, 3);
  });

  it('rejects a file that is not a real image, regardless of its declared type', async () => {
    const { volunteer, attendance } = await attendedScene();
    const res = await createRequest(volunteer, attendance)
      .attach('photos', f.garbageBuffer(50), { filename: 'photo.jpg', contentType: 'image/jpeg' });

    assert.equal(res.status, 400);
    assert.equal(codeOf(res), 'INVALID_IMAGE');
    assert.equal(await Contribution.countDocuments(), 0);
    assert.deepEqual(await storedFiles(), []);
  });

  it('rejects SVG even when it decodes, because it is not an allowed format', async () => {
    const { volunteer, attendance } = await attendedScene();
    const res = await createRequest(volunteer, attendance)
      .attach('photos', f.svgBuffer(), { filename: 'photo.svg', contentType: 'image/svg+xml' });

    assert.equal(res.status, 400);
    assert.equal(codeOf(res), 'UNSUPPORTED_IMAGE_TYPE');
    assert.equal(await Contribution.countDocuments(), 0);
  });

  it('rejects a file larger than the per-photo limit', async () => {
    const { volunteer, attendance } = await attendedScene();
    const res = await createRequest(volunteer, attendance)
      .attach('photos', f.garbageBuffer(PHOTO.maxBytes + 1), { filename: 'huge.jpg', contentType: 'image/jpeg' });

    assert.equal(res.status, 413);
    assert.equal(codeOf(res), 'PHOTO_TOO_LARGE');
    assert.equal(await Contribution.countDocuments(), 0);
  });

  it('rejects more than 5 photos on create', async () => {
    const { volunteer, attendance } = await attendedScene();
    let req = createRequest(volunteer, attendance);
    for (let i = 0; i < 6; i += 1) {
      req = req.attach('photos', await f.jpegBuffer(), { filename: `${i}.jpg`, contentType: 'image/jpeg' });
    }
    const res = await req;

    assert.equal(res.status, 400);
    assert.equal(codeOf(res), 'TOO_MANY_PHOTOS');
    assert.equal(await Contribution.countDocuments(), 0);
  });

  it('caps stored dimensions to a sensible maximum', async () => {
    const { volunteer, attendance } = await attendedScene();
    const big = await f.jpegBuffer({ width: PHOTO.maxDimension + 500, height: 100 });
    const res = await createRequest(volunteer, attendance)
      .attach('photos', big, { filename: 'wide.jpg', contentType: 'image/jpeg' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    const photoRes = await volunteer.agent.get(`/api/contributions/${res.body.contribution.id}/photos/${res.body.contribution.photos[0].id}`);
    const meta = await sharp(photoRes.body).metadata();
    assert.ok(meta.width <= PHOTO.maxDimension, meta.width);
  });

  it('strips EXIF metadata (including GPS) and auto-orients before doing so', async () => {
    const { volunteer, attendance } = await attendedScene();
    const withExif = await f.jpegBuffer({ width: 20, height: 30, withExif: true });
    const sourceMeta = await sharp(withExif).metadata();
    assert.ok(sourceMeta.exif, 'fixture should carry EXIF');
    assert.equal(sourceMeta.orientation, 6);

    const res = await createRequest(volunteer, attendance)
      .attach('photos', withExif, { filename: 'oriented.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 201, JSON.stringify(res.body));

    const photoRes = await volunteer.agent.get(`/api/contributions/${res.body.contribution.id}/photos/${res.body.contribution.photos[0].id}`);
    const meta = await sharp(photoRes.body).metadata();
    assert.equal(meta.exif, undefined);
    assert.equal(meta.orientation, undefined);
    // Orientation 6 is a 90-degree rotation: width and height swap once baked in.
    assert.equal(meta.width, 30);
    assert.equal(meta.height, 20);
  });
});

describe('contribution photos: metadata and storage keys', () => {
  it('stores metadata but never the original filename as the storage path', async () => {
    const { volunteer, attendance } = await attendedScene();
    const jpeg = await f.jpegBuffer();
    const res = await createRequest(volunteer, attendance)
      .attach('photos', jpeg, { filename: 'my private photo.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 201);

    const photo = res.body.contribution.photos[0];
    assert.equal(photo.originalName, 'my private photo.jpg');
    assert.ok(photo.size > 0);
    assert.equal(photo.mimeType, 'image/jpeg');
    assert.equal('key' in photo, false);

    const stored = await Contribution.findById(res.body.contribution.id);
    const key = stored.photos[0].key;
    assert.match(key, /^[0-9a-f]{48}\.jpg$/);
    assert.ok(!key.includes('my private photo'));

    const files = await storedFiles();
    assert.deepEqual(files, [key]);
  });
});

describe('contribution photos: cleanup on failure', () => {
  it('removes already-saved files when a later file in the same batch fails to process', async () => {
    const { volunteer, attendance } = await attendedScene();
    const jpeg = await f.jpegBuffer();
    const res = await createRequest(volunteer, attendance)
      .attach('photos', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' })
      .attach('photos', f.garbageBuffer(50), { filename: 'b.jpg', contentType: 'image/jpeg' });

    assert.equal(res.status, 400);
    assert.equal(codeOf(res), 'INVALID_IMAGE');
    assert.equal(await Contribution.countDocuments(), 0);
    assert.deepEqual(await storedFiles(), []);
  });

  it('removes saved files if the database write fails after photos are stored', async () => {
    const { volunteer, attendance } = await attendedScene();
    const first = await createRequest(volunteer, attendance);
    assert.equal(first.status, 201);

    const jpeg = await f.jpegBuffer();
    const res = await createRequest(volunteer, attendance, { description: 'A second try, with a photo.' })
      .attach('photos', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });

    assert.equal(res.status, 409);
    assert.equal(codeOf(res), 'CONTRIBUTION_EXISTS');
    assert.equal(await Contribution.countDocuments(), 1);
    assert.deepEqual(await storedFiles(), []);
  });
});

describe('POST /api/contributions/:id/photos (add)', () => {
  it('adds photos to a PENDING contribution and bumps the revision', async () => {
    const { volunteer, contribution } = await pendingContribution();
    const jpeg = await f.jpegBuffer();
    const res = await volunteer.agent
      .post(`/api/contributions/${contribution.id}/photos`)
      .attach('photos', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.contribution.photos.length, 1);
    assert.equal(res.body.contribution.revision, 1);
  });

  it('requires at least one photo', async () => {
    const { volunteer, contribution } = await pendingContribution();
    // No `photos` file attached, but still multipart so the route actually runs.
    const res = await volunteer.agent.post(`/api/contributions/${contribution.id}/photos`).field('noop', '1');
    assert.equal(res.status, 400);
    assert.equal(codeOf(res), 'VALIDATION_ERROR');
  });

  it('rejects going over the 5-photo total across multiple calls', async () => {
    const { volunteer, contribution } = await pendingContribution();
    for (let i = 0; i < PHOTO.maxCount; i += 1) {
      const res = await volunteer.agent
        .post(`/api/contributions/${contribution.id}/photos`)
        .attach('photos', await f.jpegBuffer(), { filename: `${i}.jpg`, contentType: 'image/jpeg' });
      assert.equal(res.status, 201, JSON.stringify(res.body));
    }
    const overflow = await volunteer.agent
      .post(`/api/contributions/${contribution.id}/photos`)
      .attach('photos', await f.jpegBuffer(), { filename: 'one-too-many.jpg', contentType: 'image/jpeg' });
    assert.equal(overflow.status, 400);
    assert.equal(codeOf(overflow), 'TOO_MANY_PHOTOS');
  });

  it('refuses to add photos once VERIFIED or REJECTED', async () => {
    const { volunteer, admin, contribution } = await pendingContribution();
    await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 });

    const res = await volunteer.agent
      .post(`/api/contributions/${contribution.id}/photos`)
      .attach('photos', await f.jpegBuffer(), { filename: 'late.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 409);
    assert.equal(codeOf(res), 'CONTRIBUTION_LOCKED');
    assert.deepEqual(await storedFiles(), []);
  });

  it('refuses another volunteer\'s contribution', async () => {
    const { contribution } = await pendingContribution();
    const other = await f.registerVolunteer();
    const res = await other.agent
      .post(`/api/contributions/${contribution.id}/photos`)
      .attach('photos', await f.jpegBuffer(), { filename: 'a.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 404);
  });
});

describe('DELETE /api/contributions/:id/photos/:photoId (remove)', () => {
  it('removes a photo from a PENDING contribution, bumping the revision, and deletes the file', async () => {
    const { volunteer, contribution } = await pendingContributionWithPhoto();
    const photoId = contribution.photos[0].id;
    const before = await storedFiles();
    assert.equal(before.length, 1);

    const res = await volunteer.agent.delete(`/api/contributions/${contribution.id}/photos/${photoId}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.contribution.photos.length, 0);
    assert.equal(res.body.contribution.revision, 1);
    assert.deepEqual(await storedFiles(), []);
  });

  it('answers 404 for an unknown photo id', async () => {
    const { volunteer, contribution } = await pendingContributionWithPhoto();
    const res = await volunteer.agent.delete(`/api/contributions/${contribution.id}/photos/${OBJECT_ID}`);
    assert.equal(res.status, 404);
  });

  it('refuses to remove a photo once VERIFIED or REJECTED', async () => {
    const { volunteer, admin, contribution } = await pendingContributionWithPhoto();
    await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'REJECTED', revision: 0 });

    const res = await volunteer.agent.delete(`/api/contributions/${contribution.id}/photos/${contribution.photos[0].id}`);
    assert.equal(res.status, 409);
    assert.equal(codeOf(res), 'CONTRIBUTION_LOCKED');
    assert.equal((await storedFiles()).length, 1);
  });

  it('refuses another volunteer\'s contribution', async () => {
    const { contribution } = await pendingContributionWithPhoto();
    const other = await f.registerVolunteer();
    const res = await other.agent.delete(`/api/contributions/${contribution.id}/photos/${contribution.photos[0].id}`);
    assert.equal(res.status, 404);
  });
});

describe('GET /api/contributions/:id/photos/:photoId (access)', () => {
  it('lets the owning volunteer and any admin fetch the photo', async () => {
    const { volunteer, admin, contribution } = await pendingContributionWithPhoto();
    const photoId = contribution.photos[0].id;

    const asOwner = await volunteer.agent.get(`/api/contributions/${contribution.id}/photos/${photoId}`);
    assert.equal(asOwner.status, 200);
    assert.equal(asOwner.headers['content-type'], 'image/jpeg');
    assert.equal(asOwner.headers['x-content-type-options'], 'nosniff');

    const asAdmin = await admin.agent.get(`/api/contributions/${contribution.id}/photos/${photoId}`);
    assert.equal(asAdmin.status, 200);
  });

  it('answers 404 for a photo belonging to someone else\'s contribution', async () => {
    const { contribution } = await pendingContributionWithPhoto();
    const other = await f.registerVolunteer();
    const res = await other.agent.get(`/api/contributions/${contribution.id}/photos/${contribution.photos[0].id}`);
    assert.equal(res.status, 404);
  });

  it('requires authentication', async () => {
    const { contribution } = await pendingContributionWithPhoto();
    const res = await f.client().get(`/api/contributions/${contribution.id}/photos/${contribution.photos[0].id}`);
    assert.equal(res.status, 401);
  });

  it('answers 404 for an unknown photo id', async () => {
    const { volunteer, contribution } = await pendingContributionWithPhoto();
    const res = await volunteer.agent.get(`/api/contributions/${contribution.id}/photos/${OBJECT_ID}`);
    assert.equal(res.status, 404);
  });
});
