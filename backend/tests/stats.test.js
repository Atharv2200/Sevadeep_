const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { Attendance } = require('../models');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const ZERO = {
  volunteers: { total: 0, active: 0, suspended: 0 },
  activities: { total: 0, draft: 0, open: 0, closed: 0, cancelled: 0 },
  attendance: { total: 0 },
  contributions: { pending: 0, verified: 0, rejected: 0, verifiedHours: 0 },
};

// Checks the volunteer in to the activity and returns the resulting Attendance.
async function checkIn(volunteer, activity) {
  const res = await volunteer.agent.post(`/api/activities/${activity._id}/attendance`).send(await f.checkInBody(activity));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return Attendance.findOne({ activity: activity._id, volunteer: volunteer.user.volunteer.id });
}

async function submitContribution(volunteer, attendance, overrides = {}) {
  const res = await volunteer.agent
    .post('/api/contributions')
    .send({ attendance: String(attendance._id), description: 'Helped out at the venue.', ...overrides });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.contribution;
}

describe('GET /api/stats/admin', () => {
  it('is admin-only', async () => {
    const admin = await f.loggedInAdmin();
    const volunteer = await f.registerVolunteer();
    assert.equal((await f.client().get('/api/stats/admin')).status, 401);
    assert.equal((await volunteer.agent.get('/api/stats/admin')).status, 403);
    assert.equal((await admin.agent.get('/api/stats/admin')).status, 200);
  });

  it('reports every metric as zero with no data', async () => {
    const admin = await f.loggedInAdmin();
    const res = await admin.agent.get('/api/stats/admin');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, ZERO);
  });

  it('counts volunteers by account status, excluding admins', async () => {
    const admin = await f.loggedInAdmin();
    await f.registerVolunteer();
    const toSuspend = await f.registerVolunteer();
    await f.User.updateOne({ _id: toSuspend.user.id }, { status: 'SUSPENDED' });
    await f.createAdmin();

    const res = await admin.agent.get('/api/stats/admin');
    assert.deepEqual(res.body.volunteers, { total: 2, active: 1, suspended: 1 });
  });

  it('counts activities by status', async () => {
    const admin = await f.loggedInAdmin();
    await f.seedActivity(admin.user._id, { status: 'DRAFT' });
    const toClose = await f.openActivity(admin.user._id);
    await f.openActivity(admin.user._id);
    const toCancel = await f.seedActivity(admin.user._id, { status: 'DRAFT' });

    assert.equal((await admin.agent.patch(`/api/activities/${toClose._id}/status`).send({ status: 'CLOSED' })).status, 200);
    assert.equal((await admin.agent.patch(`/api/activities/${toCancel._id}/status`).send({ status: 'CANCELLED' })).status, 200);

    const res = await admin.agent.get('/api/stats/admin');
    assert.deepEqual(res.body.activities, { total: 4, draft: 1, open: 1, closed: 1, cancelled: 1 });
  });

  it('counts every recorded attendance, regardless of activity status', async () => {
    const admin = await f.loggedInAdmin();
    const activity = await f.openActivity(admin.user._id);
    const a = await f.registerVolunteer();
    const b = await f.registerVolunteer();
    await checkIn(a, activity);
    await checkIn(b, activity);

    const res = await admin.agent.get('/api/stats/admin');
    assert.equal(res.body.attendance.total, 2);
  });

  it('splits contributions by status and sums approvedHours only for VERIFIED', async () => {
    const admin = await f.loggedInAdmin();
    const activity = await f.openActivity(admin.user._id);
    const volunteer = await f.registerVolunteer();

    const activity2 = await f.openActivity(admin.user._id, { title: 'Second drive' });
    const activity3 = await f.openActivity(admin.user._id, { title: 'Third drive' });

    const pending = await submitContribution(volunteer, await checkIn(volunteer, activity));
    const verified = await submitContribution(volunteer, await checkIn(volunteer, activity2));
    const rejected = await submitContribution(volunteer, await checkIn(volunteer, activity3));

    await admin.agent.patch(`/api/contributions/${verified.id}/review`).send({ status: 'VERIFIED', approvedHours: 3.5, revision: 0 });
    await admin.agent.patch(`/api/contributions/${rejected.id}/review`).send({ status: 'REJECTED', revision: 0 });

    const res = await admin.agent.get('/api/stats/admin');
    assert.deepEqual(res.body.contributions, { pending: 1, verified: 1, rejected: 1, verifiedHours: 3.5 });
    assert.ok(pending.id, 'sanity: a pending contribution exists');
  });

  it('never persists the aggregates it reports (derived on every read)', async () => {
    const admin = await f.loggedInAdmin();
    const activity = await f.openActivity(admin.user._id);
    const volunteer = await f.registerVolunteer();
    const contribution = await submitContribution(volunteer, await checkIn(volunteer, activity));
    await admin.agent.patch(`/api/contributions/${contribution.id}/review`).send({ status: 'VERIFIED', approvedHours: 1, revision: 0 });

    const before = await admin.agent.get('/api/stats/admin');
    assert.equal(before.body.contributions.verifiedHours, 1);

    // A second contribution, verified for more hours, changes the read immediately.
    const activity2 = await f.openActivity(admin.user._id, { title: 'Another drive' });
    const contribution2 = await submitContribution(volunteer, await checkIn(volunteer, activity2));
    await admin.agent.patch(`/api/contributions/${contribution2.id}/review`).send({ status: 'VERIFIED', approvedHours: 2, revision: 0 });

    const after = await admin.agent.get('/api/stats/admin');
    assert.equal(after.body.contributions.verifiedHours, 3);
  });
});
