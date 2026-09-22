const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { Activity, Attendance, User } = require('../models');
const attendanceService = require('../services/attendanceService');
const { createToken } = require('../services/qrTokenService');
const { buildLimiters } = require('../middleware/rateLimit');
const { attendanceFlags } = require('../utils/attendanceFlags');
const { errorHandler } = require('../middleware/errorHandler');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const OBJECT_ID = '507f1f77bcf86cd799439011';
const url = (activity, suffix = '') => `/api/activities/${activity._id ?? activity}/attendance${suffix}`;

// An admin, an OPEN activity inside its window, and a signed-in volunteer.
async function scene(activityOverrides = {}) {
  const { user: admin } = await f.createAdmin();
  const activity = await f.openActivity(admin._id, activityOverrides);
  const volunteer = await f.registerVolunteer();
  return { admin, activity, volunteer, agent: volunteer.agent };
}

const codeOf = (res) => res.body.code;

describe('POST /api/activities/:id/attendance (check-in)', () => {
  it('records the attendance with server-controlled values', async () => {
    const { activity, volunteer, agent } = await scene();
    const before = Date.now();
    const res = await agent.post(url(activity)).send(await f.checkInBody(activity, { ...f.pointAt(activity, 30), accuracy: 12.5 }));

    assert.equal(res.status, 201);
    const stored = await Attendance.findOne();
    assert.equal(await Attendance.countDocuments(), 1);
    assert.equal(String(stored.activity), String(activity._id));
    assert.equal(String(stored.volunteer), volunteer.user.volunteer.id);
    assert.ok(stored.checkedInAt.getTime() >= before && stored.checkedInAt.getTime() <= Date.now());
    assert.equal(stored.checkedOutAt, null);
    assert.equal(stored.checkOut, null);
    assert.equal(stored.checkIn.accuracy, 12.5);
    assert.ok(Math.abs(stored.checkIn.distanceMeters - 30) <= 0.1);
    assert.equal(stored.checkIn.latitude, f.pointAt(activity, 30).latitude);
  });

  it('shows the volunteer no coordinates, distance, accuracy or flags', async () => {
    const { activity, agent } = await scene();
    const res = await agent.post(url(activity)).send(await f.checkInBody(activity));
    assert.deepEqual(Object.keys(res.body.attendance).sort(), ['activity', 'checkedInAt', 'checkedOutAt', 'durationMinutes', 'id']);
    assert.deepEqual(Object.keys(res.body.attendance.activity).sort(), ['category', 'endsAt', 'id', 'locationName', 'startsAt', 'status', 'title']);
    const text = JSON.stringify(res.body);
    for (const word of ['distance', 'accuracy', 'latitude', 'longitude', 'flags', 'qrSecret']) assert.equal(text.includes(word), false, word);
  });

  it('locks the venue location once attendance exists', async () => {
    const { activity, agent } = await scene();
    assert.equal((await Activity.findById(activity._id)).locationLocked, false);
    await agent.post(url(activity)).send(await f.checkInBody(activity));
    assert.equal((await Activity.findById(activity._id)).locationLocked, true);
  });

  it('accepts the previous QR codes but not an expired one', async () => {
    const { activity, agent, admin } = await scene();
    const second = await f.registerVolunteer();
    const third = await f.registerVolunteer();
    const withSecret = await Activity.findById(activity._id).select('+qrSecret');

    const recent = createToken(withSecret, new Date(Date.now() - 3 * f.MINUTE));
    assert.equal((await agent.post(url(activity)).send(await f.checkInBody(activity, { token: recent }))).status, 201);

    const expired = createToken(withSecret, new Date(Date.now() - 6 * f.MINUTE));
    const res = await second.agent.post(url(activity)).send(await f.checkInBody(activity, { token: expired }));
    assert.equal(res.status, 403);
    assert.equal(codeOf(res), 'QR_EXPIRED');

    // A code shown a moment ago and the one on screen now both work.
    assert.equal((await third.agent.post(url(activity)).send(await f.checkInBody(activity))).status, 201);
    assert.ok(admin);
  });

  it('rejects a token from another activity, a tampered token and garbage', async () => {
    const { activity, agent, admin } = await scene();
    const other = await f.openActivity(admin._id);
    const good = await f.qrToken(activity._id);
    const tampered = `${good.slice(0, -1)}${good.endsWith('A') ? 'B' : 'A'}`;

    for (const token of [await f.qrToken(other._id), tampered, 'garbage', '1.2', good.split('.')[1], 'x'.repeat(200)]) {
      const res = await agent.post(url(activity)).send(await f.checkInBody(activity, { token }));
      assert.equal(res.status, 403, token);
      assert.equal(codeOf(res), 'INVALID_QR', token);
    }
    assert.equal(await Attendance.countDocuments(), 0);
  });

  it('checks the token before the location', async () => {
    const { activity, agent } = await scene();
    const res = await agent.post(url(activity)).send(await f.checkInBody(activity, { token: 'garbage', ...f.pointAt(activity, 9000), accuracy: 900 }));
    assert.equal(codeOf(res), 'INVALID_QR');
  });

  it('works with a regenerated secret only for new codes', async () => {
    const { activity, agent } = await scene();
    const old = await f.checkInBody(activity);
    await require('../services/qrTokenService').regenerateSecret(activity._id);
    assert.equal(codeOf(await agent.post(url(activity)).send(old)), 'INVALID_QR');
    assert.equal((await agent.post(url(activity)).send(await f.checkInBody(activity))).status, 201);
  });

  describe('location', () => {
    it('accepts a point within radius regardless of how poor the reported accuracy is', async () => {
      const { activity, agent } = await scene({ radiusMeters: 100 });
      const res = await agent.post(url(activity)).send(await f.checkInBody(activity, { accuracy: 500 }));
      assert.equal(res.status, 201);
      assert.equal((await Attendance.findOne()).checkIn.accuracy, 500);
    });

    it('rejects a point outside radius even with excellent accuracy', async () => {
      const { activity, agent } = await scene({ radiusMeters: 100 });
      const res = await agent.post(url(activity)).send(await f.checkInBody(activity, { ...f.pointAt(activity, 150), accuracy: 1 }));
      assert.equal(res.status, 422);
      assert.equal(codeOf(res), 'OUT_OF_RADIUS');
      assert.equal(await Attendance.countDocuments(), 0);
    });

    it('accepts a point on the radius and rejects one just outside', async () => {
      const { activity, agent } = await scene({ radiusMeters: 100 });
      const outside = await agent.post(url(activity)).send(await f.checkInBody(activity, f.pointAt(activity, 100.01)));
      assert.equal(outside.status, 422);
      assert.equal(codeOf(outside), 'OUT_OF_RADIUS');
      assert.equal(await Attendance.countDocuments(), 0);

      assert.equal((await agent.post(url(activity)).send(await f.checkInBody(activity, f.pointAt(activity, 99.99)))).status, 201);
    });

    it('rejects a far-away point', async () => {
      const { activity, agent } = await scene();
      const res = await agent.post(url(activity)).send(await f.checkInBody(activity, f.pointAt(activity, 25000)));
      assert.equal(codeOf(res), 'OUT_OF_RADIUS');
    });

    it('never tells the volunteer a distance or an accuracy', async () => {
      const { activity, agent } = await scene();
      for (const overrides of [{ ...f.pointAt(activity, 350) }, { ...f.pointAt(activity, 500) }]) {
        const res = await agent.post(url(activity)).send(await f.checkInBody(activity, overrides));
        assert.equal(res.status, 422);
        assert.equal(/\d/.test(res.body.message), false, res.body.message);
        assert.deepEqual(Object.keys(res.body).sort(), ['code', 'message']);
      }
    });

    it('calculates the distance itself and rejects a client-supplied one', async () => {
      const { activity, agent } = await scene();
      const res = await agent.post(url(activity)).send(await f.checkInBody(activity, { distanceMeters: 0, ...f.pointAt(activity, 60) }));
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.errors.map((e) => e.path), ['body.distanceMeters']);
      assert.equal(await Attendance.countDocuments(), 0);

      await agent.post(url(activity)).send(await f.checkInBody(activity, f.pointAt(activity, 60)));
      assert.ok(Math.abs((await Attendance.findOne()).checkIn.distanceMeters - 60) <= 0.1);
    });
  });

  describe('activity state and window', () => {
    it('answers 404 for a DRAFT or unknown activity and 400 for a malformed id', async () => {
      const { activity, agent, admin } = await scene();
      const draft = await f.openActivity(admin._id, { status: 'DRAFT' });
      assert.equal((await agent.post(url(draft)).send(await f.checkInBody(activity))).status, 404);
      assert.equal((await agent.post(url(OBJECT_ID)).send(await f.checkInBody(activity))).status, 404);
      assert.equal((await agent.post('/api/activities/nope/attendance').send(await f.checkInBody(activity))).status, 400);
    });

    it('refuses CLOSED and CANCELLED activities with distinct codes', async () => {
      const { agent, admin } = await scene();
      for (const [status, code] of [['CLOSED', 'ACTIVITY_CLOSED'], ['CANCELLED', 'ACTIVITY_CANCELLED']]) {
        const activity = await f.openActivity(admin._id, { status });
        const res = await agent.post(url(activity)).send(await f.checkInBody(activity));
        assert.equal(res.status, 409, status);
        assert.equal(codeOf(res), code);
      }
      assert.equal(await Attendance.countDocuments(), 0);
    });

    it('refuses an early close: closing stops attendance at once', async () => {
      const { activity, agent } = await scene();
      await Activity.updateOne({ _id: activity._id }, { status: 'CLOSED' });
      assert.equal(codeOf(await agent.post(url(activity)).send(await f.checkInBody(activity))), 'ACTIVITY_CLOSED');
    });

    it('refuses check-in before the window opens and after it closes', async () => {
      const { agent, admin } = await scene();
      const early = await f.openActivity(admin._id, { startsAt: new Date(Date.now() + 31 * f.MINUTE), endsAt: new Date(Date.now() + 3 * f.HOUR) });
      const late = await f.openActivity(admin._id, { startsAt: new Date(Date.now() - 3 * f.HOUR), endsAt: new Date(Date.now() - 31 * f.MINUTE) });
      for (const activity of [early, late]) {
        const res = await agent.post(url(activity)).send(await f.checkInBody(activity));
        assert.equal(res.status, 409);
        assert.equal(codeOf(res), 'ATTENDANCE_WINDOW_CLOSED');
      }
      assert.equal(await Attendance.countDocuments(), 0);
    });

    it('allows check-in inside the window before the start and after the end', async () => {
      const { agent, admin } = await scene();
      const early = await f.openActivity(admin._id, { startsAt: new Date(Date.now() + 25 * f.MINUTE), endsAt: new Date(Date.now() + 3 * f.HOUR) });
      const late = await f.openActivity(admin._id, { startsAt: new Date(Date.now() - 3 * f.HOUR), endsAt: new Date(Date.now() - 25 * f.MINUTE) });
      for (const activity of [early, late]) {
        assert.equal((await agent.post(url(activity)).send(await f.checkInBody(activity))).status, 201);
      }
    });

    it('applies the exact window boundaries (service level, injected clock)', async () => {
      const { admin, volunteer } = await scene();
      const startsAt = new Date('2031-05-01T09:00:00.000Z');
      const endsAt = new Date('2031-05-01T12:00:00.000Z');
      const activity = await f.seedActivity(admin._id, { status: 'OPEN', startsAt, endsAt, attendanceOpensMinutesBefore: 30, attendanceClosesMinutesAfter: 30 });
      const withSecret = await Activity.findById(activity._id).select('+qrSecret');
      const opensAt = new Date(startsAt.getTime() - 30 * f.MINUTE);
      const closesAt = new Date(endsAt.getTime() + 30 * f.MINUTE);
      const user = await User.findById(volunteer.user.id);

      const attempt = async (now, who = user) => {
        try {
          await attendanceService.checkIn(who, activity._id, { token: createToken(withSecret, now), ...f.pointAt(activity, 0), accuracy: 5 }, { now });
          return 'ok';
        } catch (error) {
          return error.code;
        }
      };
      const other = async () => User.findById((await f.registerVolunteer()).user.id);

      assert.equal(await attempt(new Date(opensAt.getTime() - 1)), 'ATTENDANCE_WINDOW_CLOSED');
      assert.equal(await attempt(opensAt), 'ok');
      assert.equal(await attempt(closesAt, await other()), 'ok');
      assert.equal(await attempt(new Date(closesAt.getTime() + 1), await other()), 'ATTENDANCE_WINDOW_CLOSED');
      assert.equal(await Attendance.countDocuments(), 2);
    });
  });

  describe('duplicates', () => {
    it('answers ALREADY_CHECKED_IN and keeps the first record', async () => {
      const { activity, agent } = await scene();
      const first = await agent.post(url(activity)).send(await f.checkInBody(activity));
      const again = await agent.post(url(activity)).send(await f.checkInBody(activity));
      assert.equal(again.status, 409);
      assert.equal(codeOf(again), 'ALREADY_CHECKED_IN');
      assert.equal(await Attendance.countDocuments(), 1);
      assert.equal(String((await Attendance.findOne())._id), first.body.attendance.id);
    });

    it('creates exactly one record when the same volunteer checks in ten times at once', async () => {
      const { activity, volunteer } = await scene();
      const body = await f.checkInBody(activity);
      const cookie = await f.loginCookie(volunteer.payload.email, volunteer.payload.password);
      const results = await f.withServer((server) =>
        Promise.all(Array.from({ length: 10 }, () => request(server).post(url(activity)).set('Cookie', cookie).send(body)))
      );
      assert.equal(results.filter((res) => res.status === 201).length, 1);
      assert.equal(results.filter((res) => res.status === 409 && codeOf(res) === 'ALREADY_CHECKED_IN').length, 9);
      assert.equal(await Attendance.countDocuments(), 1);
    });

    it('lets different volunteers check in to the same activity, and one volunteer to different activities', async () => {
      const { activity, agent, admin } = await scene();
      const other = await f.registerVolunteer();
      const second = await f.openActivity(admin._id);
      assert.equal((await agent.post(url(activity)).send(await f.checkInBody(activity))).status, 201);
      assert.equal((await other.agent.post(url(activity)).send(await f.checkInBody(activity))).status, 201);
      assert.equal((await agent.post(url(second)).send(await f.checkInBody(second))).status, 201);
      assert.equal(await Attendance.countDocuments(), 3);
    });

    it('is enforced by a unique index on {activity, volunteer}', async () => {
      const index = (await Attendance.collection.indexes()).find((i) => JSON.stringify(i.key) === '{"activity":1,"volunteer":1}');
      assert.equal(index.unique, true);
      const keys = (await Attendance.collection.indexes()).map((i) => JSON.stringify(i.key));
      assert.ok(keys.includes('{"volunteer":1,"checkedInAt":-1}'));
      assert.ok(keys.includes('{"activity":1,"checkedInAt":-1}'));
      const { activity, volunteer } = await scene();
      const doc = { activity: activity._id, volunteer: volunteer.user.volunteer.id, checkedInAt: new Date(), checkIn: { latitude: 1, longitude: 1, accuracy: 1, distanceMeters: 1 } };
      await Attendance.create(doc);
      await assert.rejects(Attendance.create(doc), { code: 11000 });
    });
  });

  describe('who may check in, and what they may send', () => {
    it('requires a signed-in volunteer', async () => {
      const { activity, admin } = await scene();
      const body = await f.checkInBody(activity);
      assert.equal((await f.client().post(url(activity)).send(body)).status, 401);
      const adminAgent = await f.loginAs((await User.findById(admin._id)).email);
      assert.equal((await adminAgent.post(url(activity)).send(body)).status, 403);
      assert.equal(await Attendance.countDocuments(), 0);
    });

    it('refuses a suspended volunteer and records nothing', async () => {
      const { activity, volunteer, agent } = await scene();
      await User.updateOne({ _id: volunteer.user.id }, { status: 'SUSPENDED' });
      const res = await agent.post(url(activity)).send(await f.checkInBody(activity));
      assert.equal(res.status, 403);
      assert.equal(codeOf(res), 'ACCOUNT_SUSPENDED');
      assert.equal(await Attendance.countDocuments(), 0);
    });

    it('rejects every field the client must not control', async () => {
      const { activity, agent, volunteer } = await scene();
      const body = await f.checkInBody(activity);
      for (const extra of [
        { volunteer: OBJECT_ID },
        { volunteerId: 'VOL-2026-0001' },
        { activity: OBJECT_ID },
        { checkedInAt: '2020-01-01T00:00:00Z' },
        { checkedOutAt: '2020-01-01T00:00:00Z' },
        { distanceMeters: 1 },
        { id: OBJECT_ID },
        { status: 'OPEN' },
        { extra: 1 },
      ]) {
        const res = await agent.post(url(activity)).send({ ...body, ...extra });
        assert.equal(res.status, 400, JSON.stringify(extra));
        assert.equal(codeOf(res), 'VALIDATION_ERROR');
      }
      assert.equal(await Attendance.countDocuments(), 0);
      assert.ok(volunteer);
    });

    it('validates the body', async () => {
      const { activity, agent } = await scene();
      const body = await f.checkInBody(activity);
      const bad = [
        {},
        { ...body, token: undefined },
        { ...body, token: '' },
        { ...body, token: 7 },
        { ...body, latitude: undefined },
        { ...body, latitude: 91 },
        { ...body, latitude: '18.5' },
        { ...body, longitude: -181 },
        { ...body, longitude: null },
        { ...body, accuracy: -1 },
        { ...body, accuracy: '10' },
        { ...body, accuracy: undefined },
      ];
      for (const payload of bad) {
        assert.equal((await agent.post(url(activity)).send(payload)).status, 400, JSON.stringify(payload));
      }
      assert.equal(await Attendance.countDocuments(), 0);
    });
  });

  it('stores nothing for any rejected attempt', async () => {
    const { activity, agent } = await scene();
    await agent.post(url(activity)).send(await f.checkInBody(activity, { token: 'bad' }));
    await agent.post(url(activity)).send(await f.checkInBody(activity, f.pointAt(activity, 5000)));
    await agent.post(url(activity)).send({});
    assert.equal(await Attendance.countDocuments(), 0);
    assert.equal((await Activity.findById(activity._id)).locationLocked, false);
  });
});

describe('POST /api/activities/:id/attendance/check-out', () => {
  async function checkedIn(activityOverrides) {
    const s = await scene(activityOverrides);
    await s.agent.post(url(s.activity)).send(await f.checkInBody(s.activity));
    return s;
  }
  const position = (activity, meters = 0, accuracy = 8) => ({ ...f.pointAt(activity, meters), accuracy });

  it('records the check-out with server time and evidence, without a QR', async () => {
    const { activity, agent } = await checkedIn();
    const res = await agent.post(url(activity, '/check-out')).send(position(activity, 20, 9));
    assert.equal(res.status, 200);
    assert.ok(res.body.attendance.checkedOutAt);
    assert.equal(typeof res.body.attendance.durationMinutes, 'number');

    const stored = await Attendance.findOne();
    assert.ok(stored.checkedOutAt >= stored.checkedInAt);
    assert.equal(stored.checkOut.accuracy, 9);
    assert.ok(Math.abs(stored.checkOut.distanceMeters - 20) <= 0.1);
    assert.equal(await Attendance.countDocuments(), 1);
  });

  it('shows the volunteer no evidence', async () => {
    const { activity, agent } = await checkedIn();
    const res = await agent.post(url(activity, '/check-out')).send(position(activity));
    const text = JSON.stringify(res.body);
    for (const word of ['distance', 'accuracy', 'latitude', 'flags', 'checkOut"']) assert.equal(text.includes(word), false, word);
  });

  it('requires an existing attendance of the caller', async () => {
    const { activity, agent } = await scene();
    const none = await agent.post(url(activity, '/check-out')).send(position(activity));
    assert.equal(none.status, 404);
    assert.equal(codeOf(none), 'NOT_CHECKED_IN');

    // Another volunteer's attendance is not theirs to close.
    const owner = await f.registerVolunteer();
    await owner.agent.post(url(activity)).send(await f.checkInBody(activity));
    assert.equal(codeOf(await agent.post(url(activity, '/check-out')).send(position(activity))), 'NOT_CHECKED_IN');
    assert.equal((await Attendance.findOne()).checkedOutAt, null);
  });

  it('validates the location like check-in', async () => {
    const { activity, agent } = await checkedIn({ radiusMeters: 100 });
    const far = await agent.post(url(activity, '/check-out')).send(position(activity, 100.01));
    assert.equal(codeOf(far), 'OUT_OF_RADIUS');
    assert.equal((await Attendance.findOne()).checkedOutAt, null);
    assert.equal((await agent.post(url(activity, '/check-out')).send(position(activity, 99.99, 500))).status, 200);
  });

  it('rejects a QR token, a distance and other client-controlled fields', async () => {
    const { activity, agent } = await checkedIn();
    for (const extra of [{ token: 'x' }, { distanceMeters: 0 }, { checkedOutAt: '2020-01-01T00:00:00Z' }, { volunteer: OBJECT_ID }]) {
      assert.equal((await agent.post(url(activity, '/check-out')).send({ ...position(activity), ...extra })).status, 400, JSON.stringify(extra));
    }
    assert.equal((await agent.post(url(activity, '/check-out')).send({})).status, 400);
  });

  it('cannot be done twice, and the first check-out stands', async () => {
    const { activity, agent } = await checkedIn();
    await agent.post(url(activity, '/check-out')).send(position(activity, 5));
    const first = await Attendance.findOne();
    const again = await agent.post(url(activity, '/check-out')).send(position(activity, 40));
    assert.equal(again.status, 409);
    assert.equal(codeOf(again), 'ALREADY_CHECKED_OUT');
    const stored = await Attendance.findOne();
    assert.equal(stored.checkedOutAt.getTime(), first.checkedOutAt.getTime());
    assert.equal(stored.checkOut.distanceMeters, first.checkOut.distanceMeters);
  });

  it('records only one check-out when several arrive at once', async () => {
    const { activity, volunteer } = await checkedIn();
    const cookie = await f.loginCookie(volunteer.payload.email, volunteer.payload.password);
    const results = await f.withServer((server) =>
      Promise.all(Array.from({ length: 8 }, () => request(server).post(url(activity, '/check-out')).set('Cookie', cookie).send(position(activity))))
    );
    assert.equal(results.filter((res) => res.status === 200).length, 1);
    assert.equal(results.filter((res) => codeOf(res) === 'ALREADY_CHECKED_OUT').length, 7);
  });

  it('is allowed after an admin closes the activity early, but not once it is cancelled', async () => {
    const closed = await checkedIn();
    await Activity.updateOne({ _id: closed.activity._id }, { status: 'CLOSED' });
    assert.equal((await closed.agent.post(url(closed.activity, '/check-out')).send(position(closed.activity))).status, 200);

    const cancelled = await checkedIn();
    await Activity.updateOne({ _id: cancelled.activity._id }, { status: 'CANCELLED' });
    const res = await cancelled.agent.post(url(cancelled.activity, '/check-out')).send(position(cancelled.activity));
    assert.equal(res.status, 409);
    assert.equal(codeOf(res), 'ACTIVITY_CANCELLED');
  });

  it('is allowed until the attendance window ends and refused after (service level, injected clock)', async () => {
    const { activity, volunteer } = await checkedIn();
    const user = await User.findById(volunteer.user.id);
    const closesAt = new Date(activity.endsAt.getTime() + 30 * f.MINUTE);

    await assert.rejects(
      attendanceService.checkOut(user, activity._id, position(activity), { now: new Date(closesAt.getTime() + 1) }),
      { code: 'ATTENDANCE_WINDOW_CLOSED' }
    );
    const done = await attendanceService.checkOut(user, activity._id, position(activity), { now: closesAt });
    assert.equal(new Date(done.checkedOutAt).getTime(), closesAt.getTime());
  });

  it('requires a signed-in volunteer and refuses suspended ones', async () => {
    const { activity, volunteer, agent, admin } = await checkedIn();
    assert.equal((await f.client().post(url(activity, '/check-out')).send(position(activity))).status, 401);
    const adminAgent = await f.loginAs((await User.findById(admin._id)).email);
    assert.equal((await adminAgent.post(url(activity, '/check-out')).send(position(activity))).status, 403);
    await User.updateOne({ _id: volunteer.user.id }, { status: 'SUSPENDED' });
    const res = await agent.post(url(activity, '/check-out')).send(position(activity));
    assert.equal(codeOf(res), 'ACCOUNT_SUSPENDED');
    assert.equal((await Attendance.findOne()).checkedOutAt, null);
  });
});

describe('attendance rate limit', () => {
  // A stand-in app: the real limiter, keyed by a fake signed-in user.
  function app() {
    const mini = express();
    const { attendance } = buildLimiters(true);
    mini.use((req, res, next) => {
      req.user = { id: req.get('x-user') };
      next();
    });
    mini.post('/attend', attendance, (req, res) => res.json({ ok: true }));
    mini.use(errorHandler);
    return mini;
  }

  it('answers 429 RATE_LIMITED after 20 attempts by one user in the window', async () => {
    const mini = app();
    for (let i = 0; i < 20; i += 1) assert.equal((await request(mini).post('/attend').set('x-user', 'a')).status, 200);
    const res = await request(mini).post('/attend').set('x-user', 'a');
    assert.equal(res.status, 429);
    assert.equal(res.body.code, 'RATE_LIMITED');
  });

  it('counts per user, not per address', async () => {
    const mini = app();
    for (let i = 0; i < 20; i += 1) await request(mini).post('/attend').set('x-user', 'a');
    assert.equal((await request(mini).post('/attend').set('x-user', 'a')).status, 429);
    // Same client address, different user: unaffected.
    assert.equal((await request(mini).post('/attend').set('x-user', 'b')).status, 200);
  });
});

describe('attendance flags', () => {
  const activity = { radiusMeters: 100, startsAt: new Date('2031-05-01T09:00:00Z'), endsAt: new Date('2031-05-01T12:00:00Z') };
  const record = (overrides = {}, checkIn = {}) => ({
    checkedInAt: new Date('2031-05-01T10:00:00Z'),
    checkIn: { accuracy: 10, distanceMeters: 20, ...checkIn },
    ...overrides,
  });
  const flags = (attendance) => attendanceFlags(attendance, activity, { maxAccuracy: 100 });

  it('has none for an ordinary check-in', () => {
    assert.deepEqual(flags(record()), []);
  });

  it('flags NEAR_BOUNDARY above 80% of the radius only', () => {
    assert.deepEqual(flags(record({}, { distanceMeters: 80 })), []);
    assert.deepEqual(flags(record({}, { distanceMeters: 80.1 })), ['NEAR_BOUNDARY']);
  });

  it('flags LOW_ACCURACY above half of the maximum accuracy only', () => {
    assert.deepEqual(flags(record({}, { accuracy: 50 })), []);
    assert.deepEqual(flags(record({}, { accuracy: 50.1 })), ['LOW_ACCURACY']);
  });

  it('flags EARLY before the start and LATE after the end', () => {
    assert.deepEqual(flags(record({ checkedInAt: new Date('2031-05-01T08:59:59Z') })), ['EARLY']);
    assert.deepEqual(flags(record({ checkedInAt: new Date('2031-05-01T09:00:00Z') })), []);
    assert.deepEqual(flags(record({ checkedInAt: new Date('2031-05-01T12:00:00Z') })), []);
    assert.deepEqual(flags(record({ checkedInAt: new Date('2031-05-01T12:00:01Z') })), ['LATE']);
  });

  it('can combine, in a stable order', () => {
    assert.deepEqual(flags(record({ checkedInAt: new Date('2031-05-01T12:10:00Z') }, { accuracy: 90, distanceMeters: 95 })), ['LOW_ACCURACY', 'NEAR_BOUNDARY', 'LATE']);
  });

  it('never blocks a check-in: a flagged attendance is still recorded', async () => {
    const { admin } = await scene();
    const activityDoc = await f.openActivity(admin._id, { radiusMeters: 100, startsAt: new Date(Date.now() + 20 * f.MINUTE), endsAt: new Date(Date.now() + 3 * f.HOUR) });
    const volunteer = await f.registerVolunteer();
    // Early, near the boundary, and with mediocre accuracy: all three flags, still 201.
    const res = await volunteer.agent.post(url(activityDoc)).send(await f.checkInBody(activityDoc, { ...f.pointAt(activityDoc, 95), accuracy: 90 }));
    assert.equal(res.status, 201);
    const stored = await Attendance.findOne();
    assert.deepEqual(attendanceFlags(stored, activityDoc), ['LOW_ACCURACY', 'NEAR_BOUNDARY', 'EARLY']);
  });
});
