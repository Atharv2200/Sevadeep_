const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { Attendance, Contribution, User } = require('../models');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const OBJECT_ID = '507f1f77bcf86cd799439011';
const codeOf = (res) => res.body.code;

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

function payload(attendance, overrides = {}) {
  return { attendance: String(attendance._id), description: 'Helped serve meals to 40 families.', ...overrides };
}

async function pendingContribution(overrides = {}) {
  const scene = await attendedScene(overrides);
  const res = await scene.volunteer.agent.post('/api/contributions').send(payload(scene.attendance));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...scene, contribution: res.body.contribution };
}

describe('POST /api/contributions', () => {
  it('creates a PENDING contribution owned by the caller', async () => {
    const { volunteer, activity, attendance } = await attendedScene();
    const res = await volunteer.agent.post('/api/contributions').send(payload(attendance));

    assert.equal(res.status, 201);
    assert.equal(res.body.contribution.status, 'PENDING');
    assert.equal(res.body.contribution.description, 'Helped serve meals to 40 families.');
    assert.equal(res.body.contribution.approvedHours, null);
    assert.equal(res.body.contribution.revision, 0);
    assert.equal(res.body.contribution.activity.id, String(activity._id));
    assert.equal(res.body.contribution.attendance.id, String(attendance._id));
    assert.equal('volunteer' in res.body.contribution, false);

    const stored = await Contribution.findOne();
    assert.equal(String(stored.attendance), String(attendance._id));
    assert.equal(String(stored.volunteer), volunteer.user.volunteer.id);
    assert.equal(String(stored.activity), String(activity._id));
    assert.equal(stored.status, 'PENDING');
  });

  it('requires an attendance that exists and belongs to the caller', async () => {
    const { volunteer, attendance } = await attendedScene();
    const other = await f.registerVolunteer();

    const unknown = await volunteer.agent.post('/api/contributions').send(payload({ _id: OBJECT_ID }));
    assert.equal(unknown.status, 404);
    assert.equal(codeOf(unknown), 'NOT_FOUND');

    const notMine = await other.agent.post('/api/contributions').send(payload(attendance));
    assert.equal(notMine.status, 404);
    assert.equal(codeOf(notMine), 'NOT_FOUND');
    assert.equal(await Contribution.countDocuments(), 0);
  });

  it('rejects a duplicate contribution for the same attendance', async () => {
    const { volunteer, attendance } = await attendedScene();
    const first = await volunteer.agent.post('/api/contributions').send(payload(attendance));
    assert.equal(first.status, 201);

    const again = await volunteer.agent.post('/api/contributions').send(payload(attendance, { description: 'A second try.' }));
    assert.equal(again.status, 409);
    assert.equal(codeOf(again), 'CONTRIBUTION_EXISTS');
    assert.equal(await Contribution.countDocuments(), 1);
  });

  it('creates exactly one contribution when submitted ten times at once', async () => {
    const { volunteer, attendance } = await attendedScene();
    const cookie = await f.loginCookie(volunteer.payload.email, volunteer.payload.password);
    const body = payload(attendance);
    const results = await f.withServer((server) =>
      Promise.all(Array.from({ length: 10 }, () => request(server).post('/api/contributions').set('Cookie', cookie).send(body)))
    );
    assert.equal(results.filter((res) => res.status === 201).length, 1);
    assert.equal(results.filter((res) => res.status === 409 && codeOf(res) === 'CONTRIBUTION_EXISTS').length, 9);
    assert.equal(await Contribution.countDocuments(), 1);
  });

  it('requires a description', async () => {
    const { volunteer, attendance } = await attendedScene();
    const bodies = [
      { attendance: String(attendance._id) },
      payload(attendance, { description: '' }),
      payload(attendance, { description: '   ' }),
    ];
    for (const body of bodies) {
      const res = await volunteer.agent.post('/api/contributions').send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(codeOf(res), 'VALIDATION_ERROR');
    }
    assert.equal(await Contribution.countDocuments(), 0);
  });

  it('rejects every field the client must not control', async () => {
    const { volunteer, attendance } = await attendedScene();
    for (const extra of [
      { volunteer: OBJECT_ID },
      { activity: OBJECT_ID },
      { status: 'VERIFIED' },
      { approvedHours: 5 },
      { revision: 1 },
      { review: { note: 'x' } },
      { id: OBJECT_ID },
      { createdAt: '2020-01-01T00:00:00Z' },
      { extra: 1 },
    ]) {
      const res = await volunteer.agent.post('/api/contributions').send(payload(attendance, extra));
      assert.equal(res.status, 400, JSON.stringify(extra));
      assert.equal(codeOf(res), 'VALIDATION_ERROR');
    }
    assert.equal(await Contribution.countDocuments(), 0);
  });

  it('requires a signed-in volunteer', async () => {
    const { attendance, admin } = await attendedScene();
    assert.equal((await f.client().post('/api/contributions').send(payload(attendance))).status, 401);
    const adminAgent = await f.loginAs((await User.findById(admin.user._id)).email);
    assert.equal((await adminAgent.post('/api/contributions').send(payload(attendance))).status, 403);
    assert.equal(await Contribution.countDocuments(), 0);
  });
});

describe('GET /api/contributions and /api/contributions/:id', () => {
  it('gives a volunteer only their own contributions', async () => {
    const { volunteer, attendance, admin } = await attendedScene();
    await volunteer.agent.post('/api/contributions').send(payload(attendance));
    const other = await attendedScene({ title: 'Second drive' });
    await other.volunteer.agent.post('/api/contributions').send(payload(other.attendance));

    const mine = await volunteer.agent.get('/api/contributions');
    assert.equal(mine.status, 200);
    assert.equal(mine.body.total, 1);
    assert.equal(mine.body.page, 1);
    assert.equal(mine.body.limit, 20);
    assert.ok(admin);
  });

  it('lets an admin see everyone\'s and filter by activity, status and volunteer', async () => {
    const a = await pendingContribution();
    const b = await pendingContribution();
    await a.admin.agent.patch(`/api/contributions/${a.contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 2, revision: 0 });

    const all = await a.admin.agent.get('/api/contributions');
    assert.equal(all.body.total, 2);

    const byActivity = await a.admin.agent.get('/api/contributions').query({ activity: String(a.activity._id) });
    assert.equal(byActivity.body.total, 1);
    assert.equal(byActivity.body.items[0].id, a.contribution.id);

    const byStatus = await a.admin.agent.get('/api/contributions').query({ status: 'PENDING' });
    assert.equal(byStatus.body.total, 1);
    assert.equal(byStatus.body.items[0].id, b.contribution.id);

    const byVolunteer = await a.admin.agent.get('/api/contributions').query({ volunteer: a.volunteer.user.volunteer.id });
    assert.equal(byVolunteer.body.total, 1);
    assert.equal(byVolunteer.body.items[0].id, a.contribution.id);
    assert.ok(byVolunteer.body.items[0].volunteer.volunteerId);
  });

  it('cannot be widened by a volunteer', async () => {
    const { volunteer, attendance, contribution } = await pendingContribution();
    const other = await f.registerVolunteer();
    for (const query of [{ volunteer: OBJECT_ID }, { volunteerId: 'x' }]) {
      assert.equal((await volunteer.agent.get('/api/contributions').query(query)).status, 400, JSON.stringify(query));
    }
    assert.equal((await other.agent.get('/api/contributions')).body.total, 0);
    assert.ok(attendance);
    assert.ok(contribution);
  });

  it('answers 404 for someone else\'s contribution and for an unknown id', async () => {
    const { volunteer, contribution } = await pendingContribution();
    const other = await f.registerVolunteer();
    assert.equal((await other.agent.get(`/api/contributions/${contribution.id}`)).status, 404);
    assert.equal((await volunteer.agent.get(`/api/contributions/${OBJECT_ID}`)).status, 404);
    assert.equal((await volunteer.agent.get('/api/contributions/nope')).status, 400);
  });

  it('lets the owner and an admin fetch the same contribution', async () => {
    const { volunteer, admin, contribution } = await pendingContribution();
    assert.equal((await volunteer.agent.get(`/api/contributions/${contribution.id}`)).status, 200);
    const asAdmin = await admin.agent.get(`/api/contributions/${contribution.id}`);
    assert.equal(asAdmin.status, 200);
    assert.ok(asAdmin.body.contribution.volunteer.volunteerId);
  });
});

describe('PATCH /api/contributions/:id (volunteer edit)', () => {
  it('lets the owner edit the description while PENDING, bumping the revision', async () => {
    const { volunteer, contribution } = await pendingContribution();
    const res = await volunteer.agent.patch(`/api/contributions/${contribution.id}`).send({ description: 'Updated account of the shift.' });
    assert.equal(res.status, 200);
    assert.equal(res.body.contribution.description, 'Updated account of the shift.');
    assert.equal(res.body.contribution.revision, 1);
  });

  it('rejects fields the client must not control', async () => {
    const { volunteer, contribution } = await pendingContribution();
    for (const body of [
      { description: 'x', status: 'VERIFIED' },
      { description: 'x', approvedHours: 3 },
      { description: 'x', revision: 5 },
      { description: 'x', volunteer: OBJECT_ID },
      { description: 'x', activity: OBJECT_ID },
      { description: 'x', attendance: OBJECT_ID },
      { description: 'x', review: { note: 'x' } },
    ]) {
      const res = await volunteer.agent.patch(`/api/contributions/${contribution.id}`).send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it('requires a description', async () => {
    const { volunteer, contribution } = await pendingContribution();
    for (const body of [{}, { description: '' }]) {
      assert.equal((await volunteer.agent.patch(`/api/contributions/${contribution.id}`).send(body)).status, 400);
    }
  });

  it('refuses to edit once VERIFIED', async () => {
    const { volunteer, admin, contribution } = await pendingContribution();
    await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 });
    const res = await volunteer.agent.patch(`/api/contributions/${contribution.id}`).send({ description: 'Too late.' });
    assert.equal(res.status, 409);
    assert.equal(codeOf(res), 'CONTRIBUTION_LOCKED');
    assert.equal((await Contribution.findById(contribution.id)).description, contribution.description);
  });

  it('refuses to edit once REJECTED', async () => {
    const { volunteer, admin, contribution } = await pendingContribution();
    await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'REJECTED', revision: 0 });
    const res = await volunteer.agent.patch(`/api/contributions/${contribution.id}`).send({ description: 'Too late.' });
    assert.equal(res.status, 409);
    assert.equal(codeOf(res), 'CONTRIBUTION_LOCKED');
  });

  it('refuses another volunteer\'s contribution', async () => {
    const { contribution } = await pendingContribution();
    const other = await f.registerVolunteer();
    const res = await other.agent.patch(`/api/contributions/${contribution.id}`).send({ description: 'Not mine.' });
    assert.equal(res.status, 404);
  });
});

describe('PATCH /api/contributions/:id/review (admin)', () => {
  it('verifies a PENDING contribution with admin-assigned hours', async () => {
    const { admin, contribution } = await pendingContribution();
    const res = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 3.25, note: 'Great work', revision: 0 });
    assert.equal(res.status, 200);
    assert.equal(res.body.contribution.status, 'VERIFIED');
    assert.equal(res.body.contribution.approvedHours, 3.25);
    assert.equal(res.body.contribution.review.note, 'Great work');
    assert.ok(res.body.contribution.review.reviewedAt);
    assert.equal(res.body.contribution.review.reviewedBy, String(admin.user._id));
    assert.equal(res.body.contribution.revision, 1);
  });

  it('rejects a PENDING contribution, recording no hours', async () => {
    const { admin, contribution } = await pendingContribution();
    const res = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'REJECTED', note: 'Not enough detail', revision: 0 });
    assert.equal(res.status, 200);
    assert.equal(res.body.contribution.status, 'REJECTED');
    assert.equal(res.body.contribution.approvedHours, null);
  });

  it('requires approvedHours to verify', async () => {
    const { admin, contribution } = await pendingContribution();
    const res = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', revision: 0 });
    assert.equal(res.status, 400);
    assert.equal(codeOf(res), 'VALIDATION_ERROR');
    assert.equal((await Contribution.findById(contribution.id)).status, 'PENDING');
  });

  it('forbids approvedHours when rejecting', async () => {
    const { admin, contribution } = await pendingContribution();
    const res = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'REJECTED', approvedHours: 1, revision: 0 });
    assert.equal(res.status, 400);
    assert.equal(codeOf(res), 'VALIDATION_ERROR');
  });

  it('validates approvedHours: positive, 0.25 increments, at most 24', async () => {
    const bad = [0, -1, 0.1, 0.3, 24.25, 100];
    for (const approvedHours of bad) {
      const { admin, contribution } = await pendingContribution();
      const res = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours, revision: 0 });
      assert.equal(res.status, 400, `approvedHours=${approvedHours}`);
    }
    for (const approvedHours of [0.25, 1, 3.5, 24]) {
      const { admin, contribution } = await pendingContribution();
      const res = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours, revision: 0 });
      assert.equal(res.status, 200, `approvedHours=${approvedHours}`);
      assert.equal(res.body.contribution.approvedHours, approvedHours);
    }
  });

  it('rejects a stale revision instead of applying the review', async () => {
    const { volunteer, admin, contribution } = await pendingContribution();
    // The volunteer edits after the admin loaded the contribution, advancing the revision.
    await volunteer.agent.patch(`/api/contributions/${contribution.id}`).send({ description: 'Revised account.' });

    const stale = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 });
    assert.equal(stale.status, 409);
    assert.equal(codeOf(stale), 'CONTRIBUTION_REVISION_CONFLICT');
    assert.equal((await Contribution.findById(contribution.id)).status, 'PENDING');

    const current = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 1 });
    assert.equal(current.status, 200);
  });

  it('refuses to review an already-reviewed contribution', async () => {
    const { admin, contribution } = await pendingContribution();
    const first = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 });
    assert.equal(first.status, 200);

    const again = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'REJECTED', revision: 1 });
    assert.equal(again.status, 409);
    assert.equal(codeOf(again), 'CONTRIBUTION_ALREADY_REVIEWED');
    assert.equal((await Contribution.findById(contribution.id)).status, 'VERIFIED');
    assert.equal((await Contribution.findById(contribution.id)).approvedHours, 1);
  });

  it('applies exactly one review when several requests race on the same revision', async () => {
    const { admin, contribution } = await pendingContribution();
    const cookie = await f.loginCookie((await User.findById(admin.user._id)).email);
    const results = await f.withServer((server) =>
      Promise.all(
        Array.from({ length: 5 }, () =>
          request(server).patch(`/api/contributions/${contribution.id}/review`).set('Cookie', cookie).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 })
        )
      )
    );
    assert.equal(results.filter((res) => res.status === 200).length, 1);
    assert.equal(results.filter((res) => res.status === 409).length, 4);
    assert.equal((await Contribution.findById(contribution.id)).revision, 1);
  });

  it('requires revision', async () => {
    const { admin, contribution } = await pendingContribution();
    const res = await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1 });
    assert.equal(res.status, 400);
  });

  it('is admin-only', async () => {
    const { volunteer, contribution } = await pendingContribution();
    assert.equal((await f.client().patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 })).status, 401);
    assert.equal((await volunteer.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 })).status, 403);
  });
});

describe('suggested hours', () => {
  it('suggests a duration derived from check-in and check-out, never persisted as approvedHours', async () => {
    const { volunteer, attendance, contribution } = await pendingContribution();
    const checkedInAt = new Date('2031-01-01T09:00:00.000Z');
    const checkedOutAt = new Date('2031-01-01T11:30:00.000Z');
    await Attendance.updateOne({ _id: attendance._id }, { $set: { checkedInAt, checkedOutAt } });

    const res = await volunteer.agent.get(`/api/contributions/${contribution.id}`);
    assert.equal(res.body.contribution.suggestedHours, 2.5);
    assert.equal(res.body.contribution.approvedHours, null);
  });

  it('has no suggestion without a check-out', async () => {
    const { volunteer, contribution } = await pendingContribution();
    const res = await volunteer.agent.get(`/api/contributions/${contribution.id}`);
    assert.equal(res.body.contribution.suggestedHours, null);
  });
});

describe('derived statistics', () => {
  it('counts verifiedActivities and sums verifiedHours only for VERIFIED contributions', async () => {
    const { volunteer, admin, contribution: c1 } = await pendingContribution();

    // A second contribution for the same volunteer, on a different activity.
    const otherAttendance = await (async () => {
      const activity = await f.openActivity(admin.user._id, { title: 'Second drive' });
      const checkIn = await volunteer.agent.post(`/api/activities/${activity._id}/attendance`).send(await f.checkInBody(activity));
      assert.equal(checkIn.status, 201);
      return Attendance.findOne({ activity: activity._id, volunteer: volunteer.user.volunteer.id });
    })();
    const created = await volunteer.agent.post('/api/contributions').send(payload(otherAttendance));
    const c2 = created.body.contribution;

    await admin.agent.patch(`/api/contributions/${c1.id}/review`).send({ status: 'VERIFIED', approvedHours: 2.5, revision: 0 });
    await admin.agent.patch(`/api/contributions/${c2.id}/review`).send({ status: 'REJECTED', revision: 0 });

    const stats = (await volunteer.agent.get('/api/volunteers/me')).body.stats;
    assert.equal(stats.activitiesAttended, 2);
    assert.equal(stats.verifiedActivities, 1);
    assert.equal(stats.verifiedHours, 2.5);

    const asAdmin = (await admin.agent.get(`/api/volunteers/${volunteer.user.volunteer.id}`)).body.stats;
    assert.deepEqual(asAdmin, { activitiesAttended: 2, verifiedActivities: 1, verifiedHours: 2.5 });

    const storedVolunteer = await require('../models').Volunteer.findById(volunteer.user.volunteer.id).lean();
    for (const key of ['verifiedHours', 'verifiedActivities', 'totalHours', 'eventsAttended']) {
      assert.equal(key in storedVolunteer, false, key);
    }
  });

  it('leaves a PENDING contribution out of verified statistics', async () => {
    const { volunteer } = await pendingContribution();
    const stats = (await volunteer.agent.get('/api/volunteers/me')).body.stats;
    assert.equal(stats.verifiedActivities, 0);
    assert.equal(stats.verifiedHours, 0);
  });
});
