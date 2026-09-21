const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { Activity } = require('../models');
const { STATUSES, TRANSITIONS } = require('../config/activity');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const OBJECT_ID = '507f1f77bcf86cd799439011';
const ADMIN_ONLY_FIELDS = ['allowedTransitions', 'attendanceClosesMinutesAfter', 'attendanceOpensMinutesBefore', 'createdBy'];
const MINUTE = 60 * 1000;

async function admin() {
  return f.loggedInAdmin();
}

async function volunteer() {
  return (await f.registerVolunteer()).agent;
}

const paths = (res) => res.body.errors.map((error) => error.path);

describe('POST /api/activities', () => {
  it('creates a DRAFT with server-controlled fields', async () => {
    const { agent, user } = await admin();
    const payload = f.activityPayload();
    const res = await agent.post('/api/activities').send(payload);

    assert.equal(res.status, 201);
    const { activity } = res.body;
    assert.equal(activity.status, 'DRAFT');
    assert.equal(activity.title, payload.title);
    assert.equal(activity.category, 'FOOD');
    assert.equal(activity.latitude, payload.latitude);
    assert.equal(activity.attendanceOpensMinutesBefore, 30);
    assert.equal(activity.attendanceClosesMinutesAfter, 30);
    assert.equal(activity.createdBy.id, String(user._id));
    assert.equal(activity.createdBy.name, 'Root Admin');
    assert.deepEqual(activity.allowedTransitions, ['OPEN', 'CANCELLED']);
    assert.equal(activity.attendance.isOpen, false);
    assert.ok(activity.createdAt && activity.updatedAt);

    const stored = await Activity.findById(activity.id).select('+qrSecret');
    assert.match(stored.qrSecret, /^[0-9a-f]{64}$/);
    assert.equal(String(stored.createdBy), String(user._id));
  });

  it('never returns the QR secret', async () => {
    const { agent } = await admin();
    const res = await agent.post('/api/activities').send(f.activityPayload());
    assert.equal(JSON.stringify(res.body).includes('qrSecret'), false);
    const stored = await Activity.findById(res.body.activity.id).select('+qrSecret');
    assert.equal(JSON.stringify(res.body).includes(stored.qrSecret), false);
  });

  it('trims text and accepts optional fields and explicit window minutes', async () => {
    const { agent } = await admin();
    const res = await agent
      .post('/api/activities')
      .send(f.activityPayload({ title: '  Book drive  ', instructions: undefined, address: undefined, attendanceOpensMinutesBefore: 10, attendanceClosesMinutesAfter: 0 }));
    assert.equal(res.status, 201);
    assert.equal(res.body.activity.title, 'Book drive');
    assert.equal(res.body.activity.address, '');
    assert.equal(res.body.activity.attendanceOpensMinutesBefore, 10);
    assert.equal(res.body.activity.attendanceClosesMinutesAfter, 0);
  });

  it('accepts timestamps with a UTC offset and stores them as UTC', async () => {
    const { agent } = await admin();
    const res = await agent
      .post('/api/activities')
      .send(f.activityPayload({ startsAt: '2030-01-10T10:00:00+05:30', endsAt: '2030-01-10T14:00:00+05:30' }));
    assert.equal(res.status, 201);
    assert.equal(new Date(res.body.activity.startsAt).toISOString(), '2030-01-10T04:30:00.000Z');
  });

  it('allows a start in the past so same-day events can be logged', async () => {
    const { agent } = await admin();
    const start = Date.now() - 2 * f.HOUR;
    const res = await agent
      .post('/api/activities')
      .send(f.activityPayload({ startsAt: new Date(start).toISOString(), endsAt: new Date(start + f.HOUR).toISOString() }));
    assert.equal(res.status, 201);
  });

  it('rejects fields the client must not control, one error per key', async () => {
    const { agent, user } = await admin();
    const res = await agent.post('/api/activities').send(
      f.activityPayload({ status: 'OPEN', createdBy: OBJECT_ID, qrSecret: 'x', id: OBJECT_ID, _id: OBJECT_ID, createdAt: '2020-01-01T00:00:00Z', extra: 1 })
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.deepEqual(paths(res).sort(), ['body._id', 'body.createdAt', 'body.createdBy', 'body.extra', 'body.id', 'body.qrSecret', 'body.status']);
    assert.equal(await Activity.countDocuments(), 0);
    assert.ok(user);
  });

  const INVALID = [
    ['title', { title: '' }],
    ['title', { title: 'ab' }],
    ['title', { title: 'x'.repeat(121) }],
    ['title', { title: 'bad\u0000title' }],
    ['title', { title: 42 }],
    ['description', { description: '   ' }],
    ['description', { description: 'x'.repeat(5001) }],
    ['category', { category: 'PARTY' }],
    ['category', { category: 'food' }],
    ['startsAt', { startsAt: '2030-01-10' }],
    ['startsAt', { startsAt: 'tomorrow' }],
    ['startsAt', { startsAt: 1893456000000 }],
    ['endsAt', { endsAt: '2030-13-45T10:00:00Z' }],
    ['locationName', { locationName: '' }],
    ['locationName', { locationName: 'x'.repeat(121) }],
    ['address', { address: 'x'.repeat(301) }],
    ['latitude', { latitude: 90.0001 }],
    ['latitude', { latitude: -91 }],
    ['latitude', { latitude: '18.5' }],
    ['latitude', { latitude: null }],
    ['longitude', { longitude: 180.5 }],
    ['longitude', { longitude: -181 }],
    ['radiusMeters', { radiusMeters: 24 }],
    ['radiusMeters', { radiusMeters: 5001 }],
    ['radiusMeters', { radiusMeters: 100.5 }],
    ['radiusMeters', { radiusMeters: '100' }],
    ['instructions', { instructions: 'x'.repeat(2001) }],
    ['attendanceOpensMinutesBefore', { attendanceOpensMinutesBefore: -1 }],
    ['attendanceOpensMinutesBefore', { attendanceOpensMinutesBefore: 241 }],
    ['attendanceClosesMinutesAfter', { attendanceClosesMinutesAfter: 1.5 }],
  ];
  for (const [field, override] of INVALID) {
    it(`rejects an invalid ${field}: ${JSON.stringify(override).slice(0, 40)}`, async () => {
      const { agent } = await admin();
      const res = await agent.post('/api/activities').send(f.activityPayload(override));
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'VALIDATION_ERROR');
      assert.ok(paths(res).includes(`body.${field}`), paths(res).join());
    });
  }

  it('accepts the boundary values', async () => {
    const { agent } = await admin();
    for (const override of [
      { latitude: 90, longitude: 180 },
      { latitude: -90, longitude: -180 },
      { radiusMeters: 25 },
      { radiusMeters: 5000 },
      { attendanceOpensMinutesBefore: 0, attendanceClosesMinutesAfter: 240 },
      { title: 'abc' },
      { title: 'x'.repeat(120) },
    ]) {
      const res = await agent.post('/api/activities').send(f.activityPayload(override));
      assert.equal(res.status, 201, JSON.stringify(override));
    }
  });

  it('requires every mandatory field', async () => {
    const { agent } = await admin();
    const res = await agent.post('/api/activities').send({});
    assert.equal(res.status, 400);
    for (const field of ['title', 'description', 'category', 'startsAt', 'endsAt', 'locationName', 'latitude', 'longitude', 'radiusMeters']) {
      assert.ok(paths(res).includes(`body.${field}`), field);
    }
  });

  it('requires the end to be after the start and within 7 days', async () => {
    const { agent } = await admin();
    const start = Date.now() + f.HOUR;
    const iso = (ms) => new Date(ms).toISOString();

    for (const endsAt of [iso(start), iso(start - 1)]) {
      const res = await agent.post('/api/activities').send(f.activityPayload({ startsAt: iso(start), endsAt }));
      assert.equal(res.status, 400);
      assert.ok(paths(res).includes('body.endsAt'));
    }
    const tooLong = await agent.post('/api/activities').send(f.activityPayload({ startsAt: iso(start), endsAt: iso(start + 7 * 24 * f.HOUR + 1) }));
    assert.equal(tooLong.status, 400);
    const exactly = await agent.post('/api/activities').send(f.activityPayload({ startsAt: iso(start), endsAt: iso(start + 7 * 24 * f.HOUR) }));
    assert.equal(exactly.status, 201);
  });

  it('is admin-only', async () => {
    assert.equal((await f.client().post('/api/activities').send(f.activityPayload())).status, 401);
    assert.equal((await (await volunteer()).post('/api/activities').send(f.activityPayload())).status, 403);
    assert.equal(await Activity.countDocuments(), 0);
  });
});

describe('GET /api/activities', () => {
  it('lists every status for admins, newest start first, with pagination', async () => {
    const { agent, user } = await admin();
    const base = Date.now() + 24 * f.HOUR;
    for (const [index, status] of STATUSES.entries()) {
      await f.seedActivity(user._id, {
        status,
        title: `Activity ${status}`,
        startsAt: new Date(base + index * f.HOUR),
        endsAt: new Date(base + index * f.HOUR + f.HOUR),
      });
    }
    const res = await agent.get('/api/activities');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items.map((item) => item.status), ['CANCELLED', 'CLOSED', 'OPEN', 'DRAFT']);
    assert.equal(res.body.total, 4);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 20);
    assert.ok(res.body.items.every((item) => item.createdBy.name === 'Root Admin'));

    const page2 = await agent.get('/api/activities').query({ limit: 3, page: 2 });
    assert.deepEqual(page2.body.items.map((item) => item.status), ['DRAFT']);
    assert.equal(page2.body.total, 4);
  });

  it('filters admin lists by status, category and title search', async () => {
    const { agent, user } = await admin();
    await f.seedActivity(user._id, { title: 'Winter clothes drive', category: 'CLOTHES', status: 'OPEN' });
    await f.seedActivity(user._id, { title: 'Book fair', category: 'BOOKS', status: 'DRAFT' });
    await f.seedActivity(user._id, { title: 'Clean-up (river)', category: 'CLEANLINESS', status: 'OPEN' });

    assert.equal((await agent.get('/api/activities').query({ status: 'OPEN' })).body.total, 2);
    assert.equal((await agent.get('/api/activities').query({ category: 'BOOKS' })).body.items[0].title, 'Book fair');
    assert.equal((await agent.get('/api/activities').query({ search: 'CLOTHES' })).body.total, 1);
    // Search text is matched literally, never as a pattern.
    assert.equal((await agent.get('/api/activities').query({ search: '.*' })).body.total, 0);
    assert.equal((await agent.get('/api/activities').query({ search: '(river)' })).body.total, 1);
    assert.equal((await agent.get('/api/activities').query({ search: '(' })).status, 200);
  });

  it('shows volunteers only OPEN activities that have not ended, soonest first', async () => {
    const { user } = await admin();
    const now = Date.now();
    const at = (hours, length = 2) => ({ startsAt: new Date(now + hours * f.HOUR), endsAt: new Date(now + (hours + length) * f.HOUR) });

    await f.seedActivity(user._id, { title: 'Later', status: 'OPEN', ...at(48) });
    await f.seedActivity(user._id, { title: 'Sooner', status: 'OPEN', ...at(2) });
    await f.seedActivity(user._id, { title: 'In progress', status: 'OPEN', ...at(-1, 3) });
    await f.seedActivity(user._id, { title: 'Ended but still open', status: 'OPEN', ...at(-5, 2) });
    await f.seedActivity(user._id, { title: 'Draft', status: 'DRAFT', ...at(3) });
    await f.seedActivity(user._id, { title: 'Cancelled', status: 'CANCELLED', ...at(3) });
    await f.seedActivity(user._id, { title: 'Closed', status: 'CLOSED', ...at(3) });

    const res = await (await volunteer()).get('/api/activities');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items.map((item) => item.title), ['In progress', 'Sooner', 'Later']);
    assert.equal(res.body.total, 3);
  });

  it('gives volunteers no admin-only fields, and does not let them filter by status', async () => {
    const { user } = await admin();
    await f.seedActivity(user._id, { status: 'OPEN' });
    const agent = await volunteer();

    const res = await agent.get('/api/activities');
    for (const field of ADMIN_ONLY_FIELDS) assert.equal(field in res.body.items[0], false, field);
    assert.equal('qrSecret' in res.body.items[0], false);

    const filtered = await agent.get('/api/activities').query({ status: 'DRAFT' });
    assert.equal(filtered.status, 400);
    assert.deepEqual(paths(filtered), ['query.status']);
  });

  it('lets volunteers filter by category and search', async () => {
    const { user } = await admin();
    await f.seedActivity(user._id, { status: 'OPEN', title: 'Health camp', category: 'HEALTH' });
    await f.seedActivity(user._id, { status: 'OPEN', title: 'Food drive', category: 'FOOD' });
    const agent = await volunteer();
    assert.equal((await agent.get('/api/activities').query({ category: 'HEALTH' })).body.total, 1);
    assert.equal((await agent.get('/api/activities').query({ search: 'drive' })).body.items[0].title, 'Food drive');
  });

  it('rejects bad pagination and unknown query parameters', async () => {
    const { agent } = await admin();
    for (const query of [{ limit: 101 }, { limit: 0 }, { page: 0 }, { page: 'x' }, { category: 'PARTY' }, { status: 'DONE' }, { sort: 'title' }]) {
      const res = await agent.get('/api/activities').query(query);
      assert.equal(res.status, 400, JSON.stringify(query));
    }
    assert.equal((await agent.get('/api/activities').query({ limit: 100 })).status, 200);
  });

  it('does not accept query operators', async () => {
    const { agent } = await admin();
    assert.equal((await agent.get('/api/activities?status[$ne]=OPEN')).status, 400);
    assert.equal((await agent.get('/api/activities?search[$regex]=.')).status, 400);
  });

  it('requires authentication', async () => {
    assert.equal((await f.client().get('/api/activities')).status, 401);
  });
});

describe('GET /api/activities/:id', () => {
  it('returns the full admin view for any status', async () => {
    const { agent, user } = await admin();
    for (const status of STATUSES) {
      const seeded = await f.seedActivity(user._id, { status });
      const res = await agent.get(`/api/activities/${seeded._id}`);
      assert.equal(res.status, 200, status);
      assert.equal(res.body.activity.status, status);
      assert.deepEqual(res.body.activity.allowedTransitions, TRANSITIONS[status]);
      assert.equal(res.body.activity.createdBy.id, String(user._id));
    }
  });

  it('lets volunteers read OPEN, CLOSED and CANCELLED activities, without admin fields', async () => {
    const { user } = await admin();
    const agent = await volunteer();
    for (const status of ['OPEN', 'CLOSED', 'CANCELLED']) {
      const seeded = await f.seedActivity(user._id, { status });
      const res = await agent.get(`/api/activities/${seeded._id}`);
      assert.equal(res.status, 200, status);
      assert.equal(res.body.activity.status, status);
      for (const field of ADMIN_ONLY_FIELDS) assert.equal(field in res.body.activity, false, field);
      assert.equal(JSON.stringify(res.body).includes('qrSecret'), false);
    }
  });

  it('answers 404, not 403, when a volunteer asks for a DRAFT', async () => {
    const { user } = await admin();
    const draft = await f.seedActivity(user._id, { status: 'DRAFT' });
    const res = await (await volunteer()).get(`/api/activities/${draft._id}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'NOT_FOUND');
  });

  it('answers 404 for an unknown id and 400 for a malformed one', async () => {
    const { agent } = await admin();
    assert.equal((await agent.get(`/api/activities/${OBJECT_ID}`)).status, 404);
    assert.equal((await agent.get('/api/activities/not-an-id')).status, 400);
    assert.equal((await agent.get('/api/activities/%7B%22%24ne%22%3A1%7D')).status, 400);
  });
});

describe('PATCH /api/activities/:id', () => {
  it('updates only the fields that are sent', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { title: 'Original', locationName: 'Old hall' });
    const res = await agent.patch(`/api/activities/${seeded._id}`).send({ title: '  Renamed ', radiusMeters: 250 });
    assert.equal(res.status, 200);
    assert.equal(res.body.activity.title, 'Renamed');
    assert.equal(res.body.activity.radiusMeters, 250);
    assert.equal(res.body.activity.locationName, 'Old hall');
    assert.equal(res.body.activity.status, 'DRAFT');
  });

  it('can clear the optional text fields', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id);
    const res = await agent.patch(`/api/activities/${seeded._id}`).send({ instructions: '', address: '' });
    assert.equal(res.status, 200);
    assert.equal(res.body.activity.instructions, '');
  });

  it('edits OPEN activities too', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { status: 'OPEN' });
    const res = await agent.patch(`/api/activities/${seeded._id}`).send({ description: 'Updated details' });
    assert.equal(res.status, 200);
    assert.equal(res.body.activity.status, 'OPEN');
  });

  it('never changes status, ownership, secret or timestamps', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id);
    for (const body of [{ status: 'OPEN' }, { createdBy: OBJECT_ID }, { qrSecret: 'x' }, { createdAt: '2020-01-01T00:00:00Z' }, { id: OBJECT_ID }]) {
      const res = await agent.patch(`/api/activities/${seeded._id}`).send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    const stored = await Activity.findById(seeded._id);
    assert.equal(stored.status, 'DRAFT');
    assert.equal(String(stored.createdBy), String(user._id));
  });

  it('rejects an empty body and invalid values', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id);
    assert.equal((await agent.patch(`/api/activities/${seeded._id}`).send({})).status, 400);
    assert.equal((await agent.patch(`/api/activities/${seeded._id}`).send({ latitude: 100 })).status, 400);
    assert.equal((await agent.patch(`/api/activities/${seeded._id}`).send({ title: '' })).status, 400);
  });

  it('checks a changed start or end against the stored value', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id);
    const url = `/api/activities/${seeded._id}`;

    const before = await agent.patch(url).send({ endsAt: new Date(seeded.startsAt.getTime() - 1).toISOString() });
    assert.equal(before.status, 400);
    assert.deepEqual(paths(before), ['body.endsAt']);

    const after = await agent.patch(url).send({ startsAt: new Date(seeded.endsAt.getTime() + 1).toISOString() });
    assert.equal(after.status, 400);

    const both = await agent.patch(url).send({
      startsAt: new Date(seeded.endsAt.getTime() + f.HOUR).toISOString(),
      endsAt: new Date(seeded.endsAt.getTime() + 2 * f.HOUR).toISOString(),
    });
    assert.equal(both.status, 200);
  });

  it('will not move an OPEN activity to end in the past', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { status: 'OPEN', startsAt: new Date(Date.now() - 5 * f.HOUR), endsAt: new Date(Date.now() + f.HOUR) });
    const res = await agent.patch(`/api/activities/${seeded._id}`).send({ endsAt: new Date(Date.now() - f.HOUR).toISOString() });
    assert.equal(res.status, 400);
  });

  it('locks CLOSED and CANCELLED activities', async () => {
    const { agent, user } = await admin();
    for (const status of ['CLOSED', 'CANCELLED']) {
      const seeded = await f.seedActivity(user._id, { status, title: 'Frozen title' });
      const res = await agent.patch(`/api/activities/${seeded._id}`).send({ title: 'Changed' });
      assert.equal(res.status, 409, status);
      assert.equal(res.body.code, 'ACTIVITY_LOCKED');
      assert.equal((await Activity.findById(seeded._id)).title, 'Frozen title');
    }
  });

  it('answers 404 for an unknown id and is admin-only', async () => {
    const { agent, user } = await admin();
    assert.equal((await agent.patch(`/api/activities/${OBJECT_ID}`).send({ title: 'Nope!' })).status, 404);

    const seeded = await f.seedActivity(user._id, { status: 'OPEN' });
    const url = `/api/activities/${seeded._id}`;
    assert.equal((await f.client().patch(url).send({ title: 'Hacked' })).status, 401);
    assert.equal((await (await volunteer()).patch(url).send({ title: 'Hacked' })).status, 403);
    assert.notEqual((await Activity.findById(seeded._id)).title, 'Hacked');
  });
});

describe('PATCH /api/activities/:id/status', () => {
  const VALID = [
    ['DRAFT', 'OPEN'],
    ['DRAFT', 'CANCELLED'],
    ['OPEN', 'CLOSED'],
    ['OPEN', 'CANCELLED'],
  ];
  const INVALID = STATUSES.flatMap((from) => STATUSES.map((to) => [from, to])).filter(([from, to]) => !TRANSITIONS[from].includes(to));

  it('has exactly the four finalized transitions', () => {
    assert.deepEqual(VALID.sort(), Object.entries(TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => [from, to])).sort());
    assert.equal(INVALID.length, 12);
  });

  for (const [from, to] of VALID) {
    it(`allows ${from} -> ${to}`, async () => {
      const { agent, user } = await admin();
      const seeded = await f.seedActivity(user._id, { status: from });
      const res = await agent.patch(`/api/activities/${seeded._id}/status`).send({ status: to });
      assert.equal(res.status, 200);
      assert.equal(res.body.activity.status, to);
      assert.deepEqual(res.body.activity.allowedTransitions, TRANSITIONS[to]);
      assert.equal((await Activity.findById(seeded._id)).status, to);
    });
  }

  for (const [from, to] of INVALID) {
    it(`rejects ${from} -> ${to}`, async () => {
      const { agent, user } = await admin();
      const seeded = await f.seedActivity(user._id, { status: from });
      const res = await agent.patch(`/api/activities/${seeded._id}/status`).send({ status: to });
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'INVALID_STATUS_TRANSITION');
      assert.equal((await Activity.findById(seeded._id)).status, from);
    });
  }

  it('never reopens a CLOSED activity', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { status: 'CLOSED' });
    for (const status of STATUSES) {
      assert.equal((await agent.patch(`/api/activities/${seeded._id}/status`).send({ status })).status, 409, status);
    }
  });

  it('will not open an activity that has already ended', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { status: 'DRAFT', startsAt: new Date(Date.now() - 3 * f.HOUR), endsAt: new Date(Date.now() - f.HOUR) });
    const res = await agent.patch(`/api/activities/${seeded._id}/status`).send({ status: 'OPEN' });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ACTIVITY_ALREADY_ENDED');
    // It can still be cancelled.
    assert.equal((await agent.patch(`/api/activities/${seeded._id}/status`).send({ status: 'CANCELLED' })).status, 200);
  });

  it('lets only one of two simultaneous conflicting changes win', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { status: 'DRAFT' });
    const url = `/api/activities/${seeded._id}/status`;
    const results = await Promise.all([agent.patch(url).send({ status: 'OPEN' }), agent.patch(url).send({ status: 'CANCELLED' })]);
    const statuses = results.map((res) => res.status).sort();
    assert.deepEqual(statuses, [200, 409]);
    const winner = results.find((res) => res.status === 200).body.activity.status;
    assert.equal((await Activity.findById(seeded._id)).status, winner);
  });

  it('validates the body and the id', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id);
    const url = `/api/activities/${seeded._id}/status`;
    assert.equal((await agent.patch(url).send({})).status, 400);
    assert.equal((await agent.patch(url).send({ status: 'DONE' })).status, 400);
    assert.equal((await agent.patch(url).send({ status: 'OPEN', title: 'x' })).status, 400);
    assert.equal((await agent.patch(`/api/activities/${OBJECT_ID}/status`).send({ status: 'OPEN' })).status, 404);
    assert.equal((await agent.patch('/api/activities/nope/status').send({ status: 'OPEN' })).status, 400);
  });

  it('is admin-only', async () => {
    const { user } = await admin();
    const seeded = await f.seedActivity(user._id);
    const url = `/api/activities/${seeded._id}/status`;
    assert.equal((await f.client().patch(url).send({ status: 'OPEN' })).status, 401);
    assert.equal((await (await volunteer()).patch(url).send({ status: 'OPEN' })).status, 403);
    assert.equal((await Activity.findById(seeded._id)).status, 'DRAFT');
  });
});

describe('the server-computed attendance window', () => {
  // A few seconds of margin so the request latency cannot flip a boundary.
  const SLACK = 5000;

  async function windowFor(overrides) {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { status: 'OPEN', ...overrides });
    return (await agent.get(`/api/activities/${seeded._id}`)).body.activity.attendance;
  }

  it('returns opensAt and closesAt derived from the start, end and configured minutes', async () => {
    const startsAt = new Date('2031-05-01T09:00:00.000Z');
    const endsAt = new Date('2031-05-01T12:00:00.000Z');
    const window = await windowFor({ startsAt, endsAt, attendanceOpensMinutesBefore: 45, attendanceClosesMinutesAfter: 15 });
    assert.equal(window.opensAt, '2031-05-01T08:15:00.000Z');
    assert.equal(window.closesAt, '2031-05-01T12:15:00.000Z');
    assert.equal(window.isOpen, false);
  });

  it('is closed just before the window opens and open just after', async () => {
    const at = (offset) => ({ startsAt: new Date(Date.now() + 30 * MINUTE + offset), endsAt: new Date(Date.now() + 30 * MINUTE + offset + 2 * f.HOUR) });
    assert.equal((await windowFor(at(SLACK))).isOpen, false);
    assert.equal((await windowFor(at(-SLACK))).isOpen, true);
  });

  it('is open just before the window closes and closed just after', async () => {
    const at = (offset) => ({ startsAt: new Date(Date.now() - 3 * f.HOUR), endsAt: new Date(Date.now() - 30 * MINUTE + offset) });
    assert.equal((await windowFor(at(SLACK))).isOpen, true);
    assert.equal((await windowFor(at(-SLACK))).isOpen, false);
  });

  it('uses per-activity minutes at the boundary', async () => {
    // Opens 5 minutes before the start; the start is 5 minutes away plus/minus the slack.
    const config = { attendanceOpensMinutesBefore: 5, endsAt: new Date(Date.now() + 2 * f.HOUR) };
    assert.equal((await windowFor({ ...config, startsAt: new Date(Date.now() + 5 * MINUTE + SLACK) })).isOpen, false);
    assert.equal((await windowFor({ ...config, startsAt: new Date(Date.now() + 5 * MINUTE - SLACK) })).isOpen, true);
  });

  it('is never open for a DRAFT, CLOSED or CANCELLED activity, even inside the times', async () => {
    const { agent, user } = await admin();
    for (const status of ['DRAFT', 'CLOSED', 'CANCELLED']) {
      const seeded = await f.seedActivity(user._id, { status, startsAt: new Date(Date.now() - f.HOUR), endsAt: new Date(Date.now() + f.HOUR) });
      assert.equal((await agent.get(`/api/activities/${seeded._id}`)).body.activity.attendance.isOpen, false, status);
    }
  });

  it('closes immediately when an admin closes the activity early', async () => {
    const { agent, user } = await admin();
    const seeded = await f.seedActivity(user._id, { status: 'OPEN', startsAt: new Date(Date.now() - f.HOUR), endsAt: new Date(Date.now() + f.HOUR) });
    assert.equal((await agent.get(`/api/activities/${seeded._id}`)).body.activity.attendance.isOpen, true);
    const closed = await agent.patch(`/api/activities/${seeded._id}/status`).send({ status: 'CLOSED' });
    assert.equal(closed.body.activity.attendance.isOpen, false);
  });

  it('cannot be supplied by the client', async () => {
    const { agent } = await admin();
    const res = await agent.post('/api/activities').send(f.activityPayload({ attendance: { opensAt: '2020-01-01T00:00:00Z', closesAt: '2040-01-01T00:00:00Z', isOpen: true } }));
    assert.equal(res.status, 400);
    assert.ok(paths(res).includes('body.attendance'));
  });
});
