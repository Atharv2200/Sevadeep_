const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { User, Volunteer } = require('../models');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const ZERO_STATS = { activitiesAttended: 0, verifiedActivities: 0, verifiedHours: 0 };

describe('GET /api/volunteers/me', () => {
  it('returns the caller\'s profile with derived stats', async () => {
    const { agent, payload } = await f.registerVolunteer({ name: 'Asha Rao', email: 'asha@example.org' });
    const res = await agent.get('/api/volunteers/me');
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body.volunteer).sort(), ['email', 'id', 'joinedAt', 'name', 'phone', 'volunteerId']);
    assert.equal(res.body.volunteer.email, payload.email);
    assert.match(res.body.volunteer.volunteerId, /^VOL-\d{4}-0001$/);
    assert.deepEqual(res.body.stats, ZERO_STATS);
  });

  it('has no counters stored on the volunteer document', async () => {
    await f.registerVolunteer();
    const stored = (await Volunteer.findOne({}).lean());
    for (const key of ['totalHours', 'eventsAttended', 'qrCode', 'password', 'passwordHash']) {
      assert.equal(key in stored, false, key);
    }
  });

  it('is for volunteers only', async () => {
    assert.equal((await f.client().get('/api/volunteers/me')).status, 401);
    const { agent } = await f.loggedInAdmin();
    assert.equal((await agent.get('/api/volunteers/me')).status, 403);
  });
});

describe('PATCH /api/volunteers/me', () => {
  it('updates name and phone only', async () => {
    const { agent, user } = await f.registerVolunteer();
    const res = await agent.patch('/api/volunteers/me').send({ name: '  Asha K. Rao ', phone: '+91 99999 11111' });
    assert.equal(res.status, 200);
    assert.equal(res.body.volunteer.name, 'Asha K. Rao');
    assert.equal(res.body.volunteer.phone, '+91 99999 11111');
    assert.equal(res.body.volunteer.volunteerId, user.volunteer.volunteerId);

    const stored = await Volunteer.findById(user.volunteer.id);
    assert.equal(stored.name, 'Asha K. Rao');
  });

  it('accepts a single field', async () => {
    const { agent, user } = await f.registerVolunteer();
    const res = await agent.patch('/api/volunteers/me').send({ phone: '9876543210' });
    assert.equal(res.status, 200);
    assert.equal(res.body.volunteer.name, user.volunteer.name);
  });

  it('rejects every field a volunteer must not control', async () => {
    const { agent, user } = await f.registerVolunteer();
    const forbidden = {
      email: 'new@example.org',
      volunteerId: 'VOL-2000-0001',
      id: '507f1f77bcf86cd799439011',
      status: 'ACTIVE',
      role: 'ADMIN',
      password: 'a-new-password-1',
      totalHours: 999,
      joinedAt: '2000-01-01',
    };
    for (const [field, value] of Object.entries(forbidden)) {
      const res = await agent.patch('/api/volunteers/me').send({ name: 'Ok Name', [field]: value });
      assert.equal(res.status, 400, field);
      assert.equal(res.body.errors[0].message, 'Unknown field', field);
    }
    const stored = await Volunteer.findById(user.volunteer.id);
    assert.equal(stored.volunteerId, user.volunteer.volunteerId);
    assert.equal(stored.name, user.volunteer.name);
  });

  it('rejects an empty update and invalid values', async () => {
    const { agent } = await f.registerVolunteer();
    assert.equal((await agent.patch('/api/volunteers/me').send({})).status, 400);
    assert.equal((await agent.patch('/api/volunteers/me').send({ name: '' })).status, 400);
    assert.equal((await agent.patch('/api/volunteers/me').send({ phone: 'abc' })).status, 400);
  });

  it('only ever changes the caller\'s own profile', async () => {
    const other = await f.registerVolunteer({ name: 'Other Person' });
    const { agent } = await f.registerVolunteer();
    await agent.patch('/api/volunteers/me').send({ name: 'Changed' });
    assert.equal((await Volunteer.findById(other.user.volunteer.id)).name, 'Other Person');
  });

  it('is for volunteers only', async () => {
    assert.equal((await f.client().patch('/api/volunteers/me').send({ name: 'x' })).status, 401);
    const { agent } = await f.loggedInAdmin();
    assert.equal((await agent.patch('/api/volunteers/me').send({ name: 'x' })).status, 403);
  });
});

describe('GET /api/volunteers (admin list)', () => {
  it('is admin only', async () => {
    assert.equal((await f.client().get('/api/volunteers')).status, 401);
    const { agent } = await f.registerVolunteer();
    assert.equal((await agent.get('/api/volunteers')).status, 403);
  });

  it('lists volunteers newest first with account details and no credentials', async () => {
    await f.registerVolunteer({ name: 'First Person', email: 'first@example.org' });
    await f.registerVolunteer({ name: 'Second Person', email: 'second@example.org' });
    const { agent } = await f.loggedInAdmin();

    const res = await agent.get('/api/volunteers');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 20);
    assert.deepEqual(res.body.items.map((v) => v.name), ['Second Person', 'First Person']);
    assert.deepEqual(
      Object.keys(res.body.items[0]).sort(),
      ['email', 'id', 'joinedAt', 'lastLoginAt', 'name', 'phone', 'status', 'volunteerId']
    );
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
    assert.equal(JSON.stringify(res.body).includes('account'), false);
  });

  it('paginates', async () => {
    for (let i = 1; i <= 5; i += 1) await f.registerVolunteer({ name: `Person ${i}` });
    const { agent } = await f.loggedInAdmin();

    const page1 = await agent.get('/api/volunteers?page=1&limit=2');
    const page3 = await agent.get('/api/volunteers?page=3&limit=2');
    assert.equal(page1.body.total, 5);
    assert.deepEqual(page1.body.items.map((v) => v.name), ['Person 5', 'Person 4']);
    assert.deepEqual(page3.body.items.map((v) => v.name), ['Person 1']);
    assert.equal((await agent.get('/api/volunteers?page=9&limit=2')).body.items.length, 0);
  });

  it('enforces pagination limits and rejects unknown or operator-style parameters', async () => {
    const { agent } = await f.loggedInAdmin();
    for (const query of ['limit=101', 'limit=0', 'page=0', 'page=abc', 'limit=1.5', 'sort=name', 'search[$ne]=x', 'status[$ne]=ACTIVE', 'status=DELETED']) {
      const res = await agent.get(`/api/volunteers?${query}`);
      assert.equal(res.status, 400, query);
      assert.equal(res.body.code, 'VALIDATION_ERROR', query);
    }
    assert.equal((await agent.get('/api/volunteers?limit=100')).status, 200);
  });

  it('searches name, volunteerId and email case-insensitively', async () => {
    await f.registerVolunteer({ name: 'Priya Sharma', email: 'priya@example.org' });
    const target = await f.registerVolunteer({ name: 'Rahul Verma', email: 'rahul.v@example.org' });
    const { agent } = await f.loggedInAdmin();

    const names = async (search) => (await agent.get(`/api/volunteers?search=${encodeURIComponent(search)}`)).body.items.map((v) => v.name);
    assert.deepEqual(await names('PRIYA'), ['Priya Sharma']);
    assert.deepEqual(await names('rahul.v@'), ['Rahul Verma']);
    assert.deepEqual(await names(target.user.volunteer.volunteerId), ['Rahul Verma']);
    assert.deepEqual(await names('nobody'), []);
  });

  it('treats search text literally, so regex syntax matches nothing and cannot break the query', async () => {
    await f.registerVolunteer({ name: 'Priya Sharma' });
    const { agent } = await f.loggedInAdmin();
    for (const search of ['.*', '(', '[a-z]+', 'a|P', '\\', '^P']) {
      const res = await agent.get(`/api/volunteers?search=${encodeURIComponent(search)}`);
      assert.equal(res.status, 200, search);
      assert.equal(res.body.total, 0, search);
    }
  });

  it('filters by account status', async () => {
    const suspended = await f.registerVolunteer({ name: 'Suspended One' });
    await f.registerVolunteer({ name: 'Active One' });
    await User.updateOne({ _id: suspended.user.id }, { status: 'SUSPENDED' });
    const { agent } = await f.loggedInAdmin();

    const res = await agent.get('/api/volunteers?status=SUSPENDED');
    assert.deepEqual(res.body.items.map((v) => v.name), ['Suspended One']);
    assert.equal(res.body.total, 1);
  });
});

describe('GET /api/volunteers/:id', () => {
  it('returns one volunteer with stats, by ObjectId', async () => {
    const target = await f.registerVolunteer({ email: 'asha@example.org' });
    const { agent } = await f.loggedInAdmin();
    const res = await agent.get(`/api/volunteers/${target.user.volunteer.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.volunteer.email, 'asha@example.org');
    assert.equal(res.body.volunteer.status, 'ACTIVE');
    assert.deepEqual(res.body.stats, ZERO_STATS);
  });

  it('rejects malformed ids (including the human-facing volunteerId) and unknown ids', async () => {
    const target = await f.registerVolunteer();
    const { agent } = await f.loggedInAdmin();
    assert.equal((await agent.get('/api/volunteers/not-an-id')).status, 400);
    assert.equal((await agent.get(`/api/volunteers/${target.user.volunteer.volunteerId}`)).status, 400);
    const missing = await agent.get('/api/volunteers/507f1f77bcf86cd799439011');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.code, 'NOT_FOUND');
  });

  it('is admin only, so a volunteer cannot read another volunteer', async () => {
    const other = await f.registerVolunteer();
    const { agent } = await f.registerVolunteer();
    assert.equal((await agent.get(`/api/volunteers/${other.user.volunteer.id}`)).status, 403);
    assert.equal((await f.client().get(`/api/volunteers/${other.user.volunteer.id}`)).status, 401);
  });
});

describe('PATCH /api/volunteers/:id/status', () => {
  it('suspends a volunteer, blocking their session and login while keeping their records', async () => {
    const target = await f.registerVolunteer({ email: 'asha@example.org' });
    const { agent: admin } = await f.loggedInAdmin();

    const res = await admin.patch(`/api/volunteers/${target.user.volunteer.id}/status`).send({ status: 'SUSPENDED' });
    assert.equal(res.status, 200);
    assert.equal(res.body.volunteer.status, 'SUSPENDED');

    const session = await target.agent.get('/api/volunteers/me');
    assert.equal(session.status, 403);
    assert.equal(session.body.code, 'ACCOUNT_SUSPENDED');
    const login = await f.client().post('/api/auth/login').send({ email: 'asha@example.org', password: target.payload.password });
    assert.equal(login.status, 403);

    assert.ok(await Volunteer.findById(target.user.volunteer.id), 'profile is preserved');
    assert.equal(await User.countDocuments({ volunteer: target.user.volunteer.id }), 1);
  });

  it('reactivates a volunteer', async () => {
    const target = await f.registerVolunteer();
    const { agent: admin } = await f.loggedInAdmin();
    const url = `/api/volunteers/${target.user.volunteer.id}/status`;
    await admin.patch(url).send({ status: 'SUSPENDED' });
    await admin.patch(url).send({ status: 'ACTIVE' });
    assert.equal((await target.agent.get('/api/volunteers/me')).status, 200);
  });

  it('is idempotent', async () => {
    const target = await f.registerVolunteer();
    const { agent: admin } = await f.loggedInAdmin();
    const url = `/api/volunteers/${target.user.volunteer.id}/status`;
    assert.equal((await admin.patch(url).send({ status: 'SUSPENDED' })).status, 200);
    assert.equal((await admin.patch(url).send({ status: 'SUSPENDED' })).status, 200);
  });

  it('validates input and the target', async () => {
    const target = await f.registerVolunteer();
    const { agent: admin } = await f.loggedInAdmin();
    const url = `/api/volunteers/${target.user.volunteer.id}/status`;
    assert.equal((await admin.patch(url).send({ status: 'DELETED' })).status, 400);
    assert.equal((await admin.patch(url).send({})).status, 400);
    assert.equal((await admin.patch(url).send({ status: 'ACTIVE', role: 'ADMIN' })).status, 400);
    assert.equal((await admin.patch('/api/volunteers/507f1f77bcf86cd799439011/status').send({ status: 'ACTIVE' })).status, 404);
    assert.equal((await admin.patch('/api/volunteers/nope/status').send({ status: 'ACTIVE' })).status, 400);
  });

  it('cannot be used by a volunteer, even on their own account', async () => {
    const { agent, user } = await f.registerVolunteer();
    const res = await agent.patch(`/api/volunteers/${user.volunteer.id}/status`).send({ status: 'ACTIVE' });
    assert.equal(res.status, 403);
    assert.equal((await f.client().patch(`/api/volunteers/${user.volunteer.id}/status`).send({ status: 'ACTIVE' })).status, 401);
  });
});
