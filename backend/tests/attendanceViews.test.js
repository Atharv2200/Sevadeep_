const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { Activity, Attendance, User, Volunteer } = require('../models');
const { verifyToken } = require('../services/qrTokenService');
const { LIVE_LIMIT } = require('../services/attendanceService');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const OBJECT_ID = '507f1f77bcf86cd799439011';
const codeOf = (res) => res.body.code;
const attendUrl = (activity, suffix = '') => `/api/activities/${activity._id ?? activity}/attendance${suffix}`;

async function adminScene(activityOverrides = {}) {
  const admin = await f.loggedInAdmin();
  const activity = await f.openActivity(admin.user._id, activityOverrides);
  return { admin, activity };
}

// A volunteer who has checked in to `activity`.
async function attendee(activity, { meters = 10, accuracy = 8, ...profile } = {}) {
  const volunteer = await f.registerVolunteer(profile);
  const res = await volunteer.agent.post(attendUrl(activity)).send(await f.checkInBody(activity, { ...f.pointAt(activity, meters), accuracy }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return volunteer;
}

describe('GET /api/activities/:id/qr', () => {
  it('returns a server-generated URL, expiry and refresh time, never cached', async () => {
    const { admin, activity } = await adminScene();
    const res = await admin.agent.get(`/api/activities/${activity._id}/qr`);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ['expiresAt', 'refreshInSeconds', 'url']);
    assert.match(res.headers['cache-control'], /no-store/);

    // Built from PUBLIC_APP_URL, pointing at this activity's attendance page.
    const url = new URL(res.body.url);
    assert.equal(url.origin, 'http://localhost:5173');
    assert.equal(url.pathname, `/attend/${activity._id}`);
    assert.deepEqual([...url.searchParams.keys()], ['t']);

    assert.ok(Number.isInteger(res.body.refreshInSeconds) && res.body.refreshInSeconds >= 1 && res.body.refreshInSeconds <= 60);
    const lifetime = new Date(res.body.expiresAt).getTime() - Date.now();
    assert.ok(lifetime > 3 * f.MINUTE && lifetime <= 5 * f.MINUTE, `expires in ${lifetime} ms`);
  });

  it('issues a token the server accepts, and volunteers can check in with it', async () => {
    const { admin, activity } = await adminScene();
    const res = await admin.agent.get(`/api/activities/${activity._id}/qr`);
    const token = new URL(res.body.url).searchParams.get('t');
    verifyToken(await Activity.findById(activity._id).select('+qrSecret'), token);

    const volunteer = await f.registerVolunteer();
    const checkIn = await volunteer.agent.post(attendUrl(activity)).send({ token, ...f.pointAt(activity, 5), accuracy: 5 });
    assert.equal(checkIn.status, 201);
  });

  it('is admin-only', async () => {
    const { activity } = await adminScene();
    assert.equal((await f.client().get(`/api/activities/${activity._id}/qr`)).status, 401);
    const { agent } = await f.registerVolunteer();
    assert.equal((await agent.get(`/api/activities/${activity._id}/qr`)).status, 403);
  });

  it('refuses a DRAFT, CLOSED or CANCELLED activity', async () => {
    const { admin } = await adminScene();
    for (const [status, code] of [['DRAFT', 'ACTIVITY_NOT_OPEN'], ['CLOSED', 'ACTIVITY_CLOSED'], ['CANCELLED', 'ACTIVITY_CANCELLED']]) {
      const activity = await f.openActivity(admin.user._id, { status });
      const res = await admin.agent.get(`/api/activities/${activity._id}/qr`);
      assert.equal(res.status, 409, status);
      assert.equal(codeOf(res), code);
    }
  });

  it('refuses an OPEN activity outside its attendance window', async () => {
    const { admin } = await adminScene();
    const early = await f.openActivity(admin.user._id, { startsAt: new Date(Date.now() + 40 * f.MINUTE), endsAt: new Date(Date.now() + 3 * f.HOUR) });
    const late = await f.openActivity(admin.user._id, { startsAt: new Date(Date.now() - 3 * f.HOUR), endsAt: new Date(Date.now() - 40 * f.MINUTE) });
    for (const activity of [early, late]) {
      const res = await admin.agent.get(`/api/activities/${activity._id}/qr`);
      assert.equal(res.status, 409);
      assert.equal(codeOf(res), 'ATTENDANCE_WINDOW_CLOSED');
    }
  });

  it('stops issuing codes when an admin closes the activity', async () => {
    const { admin, activity } = await adminScene();
    assert.equal((await admin.agent.get(`/api/activities/${activity._id}/qr`)).status, 200);
    await admin.agent.patch(`/api/activities/${activity._id}/status`).send({ status: 'CLOSED' });
    assert.equal(codeOf(await admin.agent.get(`/api/activities/${activity._id}/qr`)), 'ACTIVITY_CLOSED');
  });

  it('answers 404 for an unknown activity and 400 for a malformed id', async () => {
    const { admin } = await adminScene();
    assert.equal((await admin.agent.get(`/api/activities/${OBJECT_ID}/qr`)).status, 404);
    assert.equal((await admin.agent.get('/api/activities/nope/qr')).status, 400);
  });

  it('never exposes the QR secret anywhere', async () => {
    const { admin, activity } = await adminScene();
    const volunteer = await attendee(activity);
    const secret = (await Activity.findById(activity._id).select('+qrSecret')).qrSecret;
    const responses = [
      await admin.agent.get(`/api/activities/${activity._id}/qr`),
      await admin.agent.get(`/api/activities/${activity._id}`),
      await admin.agent.get('/api/activities'),
      await admin.agent.get(`/api/activities/${activity._id}/attendance`),
      await admin.agent.get('/api/attendance'),
      await volunteer.agent.get(`/api/activities/${activity._id}`),
      await volunteer.agent.get('/api/activities'),
      await volunteer.agent.get('/api/attendance'),
      await admin.agent.patch(`/api/activities/${activity._id}`).send({ title: 'Renamed again' }),
    ];
    for (const res of responses) {
      const text = JSON.stringify(res.body);
      assert.equal(text.includes(secret), false, res.request.url);
      assert.equal(text.includes('qrSecret'), false, res.request.url);
    }
  });
});

describe('GET /api/activities/:id/attendance (live)', () => {
  it('lists who has checked in, newest first, with the evidence an admin needs', async () => {
    const { admin, activity } = await adminScene({ radiusMeters: 100 });
    const first = await attendee(activity, { name: 'Asha Rao', meters: 10, accuracy: 8 });
    const second = await attendee(activity, { name: 'Ravi Kumar', meters: 90, accuracy: 70 });

    const res = await admin.agent.get(attendUrl(activity));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    assert.deepEqual(res.body.items.map((item) => item.volunteer.name), ['Ravi Kumar', 'Asha Rao']);

    const [newest, oldest] = res.body.items;
    assert.equal(newest.volunteer.volunteerId, second.user.volunteer.volunteerId);
    assert.equal(oldest.volunteer.volunteerId, first.user.volunteer.volunteerId);
    assert.ok(newest.checkedInAt && newest.checkedOutAt === null && newest.checkOut === null);
    assert.equal(newest.checkIn.accuracy, 70);
    assert.ok(Math.abs(newest.checkIn.distanceMeters - 90) <= 0.1);
    assert.deepEqual(newest.flags, ['LOW_ACCURACY', 'NEAR_BOUNDARY']);
    assert.deepEqual(oldest.flags, []);
  });

  it('shows the check-out once it happens', async () => {
    const { admin, activity } = await adminScene();
    const volunteer = await attendee(activity);
    await volunteer.agent.post(attendUrl(activity, '/check-out')).send({ ...f.pointAt(activity, 3), accuracy: 6 });
    const [item] = (await admin.agent.get(attendUrl(activity))).body.items;
    assert.ok(item.checkedOutAt);
    assert.equal(item.checkOut.accuracy, 6);
    assert.equal(typeof item.durationMinutes, 'number');
  });

  it('exposes only name and volunteer ID, not contact details', async () => {
    const { admin, activity } = await adminScene();
    const volunteer = await attendee(activity);
    const text = JSON.stringify((await admin.agent.get(attendUrl(activity))).body);
    assert.equal(text.includes(volunteer.payload.email), false);
    assert.equal(text.includes(volunteer.payload.phone), false);
    assert.deepEqual(Object.keys((await admin.agent.get(attendUrl(activity))).body.items[0].volunteer).sort(), ['id', 'name', 'volunteerId']);
  });

  it('only includes this activity', async () => {
    const { admin, activity } = await adminScene();
    const other = await f.openActivity(admin.user._id);
    await attendee(activity);
    await attendee(other);
    assert.equal((await admin.agent.get(attendUrl(activity))).body.total, 1);
  });

  it('returns at most 200 rows and reports the full total', async () => {
    const { admin, activity } = await adminScene();
    const evidence = { latitude: activity.latitude, longitude: activity.longitude, accuracy: 5, distanceMeters: 1 };
    const rows = Array.from({ length: LIVE_LIMIT + 1 }, (_, i) => ({
      activity: activity._id,
      volunteer: new mongoose.Types.ObjectId(),
      checkedInAt: new Date(Date.now() - i * 1000),
      checkIn: evidence,
    }));
    await Attendance.insertMany(rows);
    const res = await admin.agent.get(attendUrl(activity));
    assert.equal(res.body.items.length, LIVE_LIMIT);
    assert.equal(res.body.total, LIVE_LIMIT + 1);
    // Newest first: the oldest row is the one left out.
    assert.equal(res.body.items[0].checkedInAt, rows[0].checkedInAt.toISOString());
    assert.equal(res.body.items.at(-1).checkedInAt, rows[LIVE_LIMIT - 1].checkedInAt.toISOString());
  });

  it('is admin-only, and 404 for an unknown activity', async () => {
    const { admin, activity } = await adminScene();
    assert.equal((await f.client().get(attendUrl(activity))).status, 401);
    const volunteer = await f.registerVolunteer();
    assert.equal((await volunteer.agent.get(attendUrl(activity))).status, 403);
    assert.equal((await admin.agent.get(attendUrl(OBJECT_ID))).status, 404);
    assert.equal((await admin.agent.get('/api/activities/nope/attendance')).status, 400);
  });

  it('accepts no query parameters', async () => {
    const { admin, activity } = await adminScene();
    assert.equal((await admin.agent.get(`${attendUrl(activity)}?page=2`)).status, 400);
  });
});

describe('GET /api/attendance (history)', () => {
  it('gives a volunteer only their own records, without evidence or flags', async () => {
    const { activity, admin } = await adminScene();
    const second = await f.openActivity(admin.user._id, { title: 'Second drive' });
    const mine = await attendee(activity);
    await mine.agent.post(attendUrl(second)).send(await f.checkInBody(second));
    await attendee(activity);

    const res = await mine.agent.get('/api/attendance');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 20);
    assert.deepEqual(res.body.items.map((item) => item.activity.title), ['Second drive', activity.title]);
    const text = JSON.stringify(res.body);
    for (const word of ['distance', 'accuracy', 'latitude', 'longitude', 'flags', 'volunteerId', 'checkIn"']) assert.equal(text.includes(word), false, word);
  });

  it('cannot be widened by a volunteer', async () => {
    const { activity } = await adminScene();
    const mine = await attendee(activity);
    const other = await attendee(activity);
    const otherId = other.user.volunteer.id;
    for (const query of [{ volunteer: otherId }, { volunteerId: 'x' }, { status: 'x' }]) {
      assert.equal((await mine.agent.get('/api/attendance').query(query)).status, 400, JSON.stringify(query));
    }
    // Filtering by activity still only ever returns their own record.
    const res = await mine.agent.get('/api/attendance').query({ activity: String(activity._id) });
    assert.equal(res.body.total, 1);
  });

  it('lets a volunteer find their record for one activity', async () => {
    const { activity, admin } = await adminScene();
    const other = await f.openActivity(admin.user._id);
    const mine = await attendee(activity);
    assert.equal((await mine.agent.get('/api/attendance').query({ activity: String(activity._id) })).body.total, 1);
    assert.equal((await mine.agent.get('/api/attendance').query({ activity: String(other._id) })).body.total, 0);
  });

  it('gives admins everyone\'s records with evidence, and lets them filter', async () => {
    const { admin, activity } = await adminScene();
    const other = await f.openActivity(admin.user._id);
    const one = await attendee(activity, { meters: 95 });
    await attendee(other);

    const all = await admin.agent.get('/api/attendance');
    assert.equal(all.body.total, 2);
    assert.ok(all.body.items.every((item) => item.checkIn && item.volunteer.volunteerId && Array.isArray(item.flags)));

    assert.equal((await admin.agent.get('/api/attendance').query({ activity: String(activity._id) })).body.total, 1);
    const byVolunteer = await admin.agent.get('/api/attendance').query({ volunteer: one.user.volunteer.id });
    assert.equal(byVolunteer.body.total, 1);
    assert.deepEqual(byVolunteer.body.items[0].flags, ['NEAR_BOUNDARY']);
    assert.equal(byVolunteer.body.items[0].activity.id, String(activity._id));
  });

  it('paginates', async () => {
    const { admin } = await adminScene();
    const mine = await f.registerVolunteer();
    const evidence = { latitude: 1, longitude: 1, accuracy: 1, distanceMeters: 1 };
    const activities = await Promise.all(Array.from({ length: 5 }, () => f.openActivity(admin.user._id)));
    await Attendance.insertMany(
      activities.map((a, i) => ({ activity: a._id, volunteer: mine.user.volunteer.id, checkedInAt: new Date(Date.now() - i * 1000), checkIn: evidence }))
    );

    const first = await mine.agent.get('/api/attendance').query({ limit: 2 });
    assert.equal(first.body.items.length, 2);
    assert.equal(first.body.total, 5);
    const last = await mine.agent.get('/api/attendance').query({ limit: 2, page: 3 });
    assert.equal(last.body.items.length, 1);
    assert.equal(last.body.page, 3);
    assert.equal((await mine.agent.get('/api/attendance').query({ page: 9 })).body.items.length, 0);
  });

  it('rejects bad pagination and filters', async () => {
    const { admin } = await adminScene();
    for (const query of [{ limit: 101 }, { limit: 0 }, { page: 0 }, { activity: 'nope' }, { volunteer: 'nope' }, { sort: 'x' }]) {
      assert.equal((await admin.agent.get('/api/attendance').query(query)).status, 400, JSON.stringify(query));
    }
    assert.equal((await admin.agent.get('/api/attendance?activity[$ne]=1')).status, 400);
    assert.equal((await admin.agent.get('/api/attendance').query({ limit: 100 })).status, 200);
  });

  it('requires authentication and blocks suspended accounts', async () => {
    assert.equal((await f.client().get('/api/attendance')).status, 401);
    const volunteer = await f.registerVolunteer();
    await User.updateOne({ _id: volunteer.user.id }, { status: 'SUSPENDED' });
    const res = await volunteer.agent.get('/api/attendance');
    assert.equal(res.status, 403);
    assert.equal(codeOf(res), 'ACCOUNT_SUSPENDED');
  });

  it('keeps history intact when a volunteer is suspended', async () => {
    const { admin, activity } = await adminScene();
    const volunteer = await attendee(activity);
    await admin.agent.patch(`/api/volunteers/${volunteer.user.volunteer.id}/status`).send({ status: 'SUSPENDED' });
    assert.equal(await Attendance.countDocuments(), 1);
    assert.equal((await admin.agent.get('/api/attendance').query({ volunteer: volunteer.user.volunteer.id })).body.total, 1);
  });
});

describe('volunteer statistics', () => {
  it('counts attendance records, derived and never stored', async () => {
    const { admin, activity } = await adminScene();
    const second = await f.openActivity(admin.user._id);
    const mine = await attendee(activity);
    await mine.agent.post(attendUrl(second)).send(await f.checkInBody(second));
    const other = await attendee(activity);

    assert.equal((await mine.agent.get('/api/volunteers/me')).body.stats.activitiesAttended, 2);
    assert.equal((await other.agent.get('/api/volunteers/me')).body.stats.activitiesAttended, 1);
    assert.deepEqual((await admin.agent.get(`/api/volunteers/${mine.user.volunteer.id}`)).body.stats, { activitiesAttended: 2, verifiedActivities: 0, verifiedHours: 0 });

    const stored = await Volunteer.findById(mine.user.volunteer.id).lean();
    for (const key of ['activitiesAttended', 'eventsAttended', 'totalHours']) assert.equal(key in stored, false, key);
  });

  it('counts a check-in once even after check-out', async () => {
    const { activity } = await adminScene();
    const volunteer = await attendee(activity);
    await volunteer.agent.post(attendUrl(activity, '/check-out')).send({ ...f.pointAt(activity, 1), accuracy: 5 });
    assert.equal((await volunteer.agent.get('/api/volunteers/me')).body.stats.activitiesAttended, 1);
  });
});

describe('location lock', () => {
  it('lets the location change freely before anyone has checked in', async () => {
    const { admin, activity } = await adminScene();
    const res = await admin.agent.patch(`/api/activities/${activity._id}`).send({ latitude: 19.5, longitude: 74.5, radiusMeters: 300 });
    assert.equal(res.status, 200);
    assert.equal(res.body.activity.locationLocked, false);
  });

  it('refuses changes to latitude, longitude and radiusMeters once attendance exists', async () => {
    const { admin, activity } = await adminScene();
    await attendee(activity);
    for (const change of [{ latitude: activity.latitude + 0.01 }, { longitude: activity.longitude + 0.01 }, { radiusMeters: 500 }, { latitude: 1, longitude: 2, radiusMeters: 30 }]) {
      const res = await admin.agent.patch(`/api/activities/${activity._id}`).send(change);
      assert.equal(res.status, 409, JSON.stringify(change));
      assert.equal(codeOf(res), 'ACTIVITY_LOCATION_LOCKED');
    }
    const stored = await Activity.findById(activity._id);
    assert.equal(stored.latitude, activity.latitude);
    assert.equal(stored.longitude, activity.longitude);
    assert.equal(stored.radiusMeters, activity.radiusMeters);
  });

  it('still allows everything else, and re-sending the current location', async () => {
    const { admin, activity } = await adminScene();
    await attendee(activity);
    const res = await admin.agent.patch(`/api/activities/${activity._id}`).send({
      title: 'A better title',
      instructions: 'Meet at the gate',
      latitude: activity.latitude,
      longitude: activity.longitude,
      radiusMeters: activity.radiusMeters,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.activity.title, 'A better title');
    assert.equal(res.body.activity.locationLocked, true);
  });

  it('applies to activities created before the lock existed once attendance is recorded', async () => {
    const { admin, activity } = await adminScene();
    await Activity.collection.updateOne({ _id: activity._id }, { $unset: { locationLocked: '' } });
    assert.equal((await admin.agent.patch(`/api/activities/${activity._id}`).send({ radiusMeters: 250 })).status, 200);
    await attendee(activity, { meters: 10 });
    assert.equal(codeOf(await admin.agent.patch(`/api/activities/${activity._id}`).send({ radiusMeters: 999 })), 'ACTIVITY_LOCATION_LOCKED');
  });

  it('exposes the lock to admins only', async () => {
    const { admin, activity } = await adminScene();
    const volunteer = await attendee(activity);
    assert.equal((await admin.agent.get(`/api/activities/${activity._id}`)).body.activity.locationLocked, true);
    assert.equal('locationLocked' in (await volunteer.agent.get(`/api/activities/${activity._id}`)).body.activity, false);
  });

  it('lets exactly one win when a check-in and a location edit race', async () => {
    // Either the edit lands first (the check-in is then judged against the new venue and,
    // from the old spot, rejected) or the check-in locks the location first (the edit is
    // refused). Never both, so attendance is always measured against the stored venue.
    for (let round = 0; round < 12; round += 1) {
      const { admin, activity } = await adminScene({ radiusMeters: 100 });
      const volunteer = await f.registerVolunteer();
      const body = await f.checkInBody(activity);
      const volunteerCookie = await f.loginCookie(volunteer.payload.email, volunteer.payload.password);
      const adminCookie = await f.loginCookie((await User.findById(admin.user._id)).email);

      const [patch, checkIn] = await f.withServer((server) =>
        Promise.all([
          request(server).patch(`/api/activities/${activity._id}`).set('Cookie', adminCookie).send({ latitude: activity.latitude + 0.1 }),
          request(server).post(attendUrl(activity)).set('Cookie', volunteerCookie).send(body),
        ])
      );

      const stored = await Activity.findById(activity._id);
      const recorded = await Attendance.countDocuments({ activity: activity._id });
      assert.equal(patch.status === 200, recorded === 0, `round ${round}: patch ${patch.status}, check-in ${checkIn.status}`);
      if (patch.status === 200) {
        assert.equal(stored.latitude, activity.latitude + 0.1);
        assert.equal(codeOf(checkIn), 'OUT_OF_RADIUS');
      } else {
        assert.equal(codeOf(patch), 'ACTIVITY_LOCATION_LOCKED');
        assert.equal(stored.latitude, activity.latitude);
        assert.equal(checkIn.status, 201);
      }
    }
  });
});
