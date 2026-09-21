const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('./helpers/db');
const { User, Volunteer, Counter } = require('../models');
const { hashPassword, verifyPassword } = require('../utils/password');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

async function makeVolunteer(overrides = {}) {
  return Volunteer.create({ volunteerId: 'VOL-2026-0001', name: 'Asha Rao', phone: '+91 98765 43210', ...overrides });
}

describe('Counter', () => {
  it('increments each named sequence independently', async () => {
    assert.equal(await Counter.next('a'), 1);
    assert.equal(await Counter.next('a'), 2);
    assert.equal(await Counter.next('b'), 1);
  });

  it('hands out distinct values to concurrent callers, including the first', async () => {
    const values = await Promise.all(Array.from({ length: 20 }, () => Counter.next('race')));
    assert.deepEqual([...values].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

describe('Volunteer', () => {
  it('stores only profile fields', async () => {
    const volunteer = (await makeVolunteer()).toObject();
    const keys = Object.keys(volunteer).sort();
    assert.deepEqual(keys, ['__v', '_id', 'createdAt', 'name', 'phone', 'updatedAt', 'volunteerId']);
  });

  it('rejects a malformed volunteerId', async () => {
    await assert.rejects(makeVolunteer({ volunteerId: 'VOL-26-1' }), { name: 'ValidationError' });
  });

  it('enforces a unique volunteerId at the database level', async () => {
    await makeVolunteer();
    await assert.rejects(makeVolunteer(), { code: 11000 });
  });

  it('keeps volunteerId immutable through updates', async () => {
    const volunteer = await makeVolunteer();
    await Volunteer.findByIdAndUpdate(volunteer._id, { volunteerId: 'VOL-2026-0999', name: 'New Name' });
    const reloaded = await Volunteer.findById(volunteer._id);
    assert.equal(reloaded.volunteerId, 'VOL-2026-0001');
    assert.equal(reloaded.name, 'New Name');

    reloaded.volunteerId = 'VOL-2026-0999';
    await reloaded.save();
    assert.equal((await Volunteer.findById(volunteer._id)).volunteerId, 'VOL-2026-0001');
  });
});

describe('User', () => {
  const base = { email: 'asha@example.org', passwordHash: 'hash' };

  it('requires a volunteer profile for a VOLUNTEER', async () => {
    await assert.rejects(User.create({ ...base, role: 'VOLUNTEER' }), { name: 'ValidationError' });
    const volunteer = await makeVolunteer();
    const user = await User.create({ ...base, role: 'VOLUNTEER', volunteer: volunteer._id });
    assert.equal(user.status, 'ACTIVE');
    assert.equal(user.mustChangePassword, false);
  });

  it('requires a name and forbids a profile for an ADMIN', async () => {
    await assert.rejects(User.create({ ...base, role: 'ADMIN' }), { name: 'ValidationError' });
    const volunteer = await makeVolunteer();
    await assert.rejects(
      User.create({ ...base, role: 'ADMIN', name: 'Root', volunteer: volunteer._id }),
      { name: 'ValidationError' }
    );
    await User.create({ ...base, role: 'ADMIN', name: 'Root' });
  });

  it('rejects unknown roles and statuses', async () => {
    await assert.rejects(User.create({ ...base, role: 'SUPER_ADMIN', name: 'x' }), { name: 'ValidationError' });
    await assert.rejects(
      User.create({ ...base, role: 'ADMIN', name: 'x', status: 'BANNED' }),
      { name: 'ValidationError' }
    );
  });

  it('normalises email and keeps it unique regardless of case', async () => {
    const admin = await User.create({ ...base, email: '  Root@Example.ORG ', role: 'ADMIN', name: 'Root' });
    assert.equal(admin.email, 'root@example.org');
    await assert.rejects(
      User.create({ ...base, email: 'ROOT@example.org', role: 'ADMIN', name: 'Other' }),
      { code: 11000 }
    );
  });

  it('allows only one user per volunteer profile, but many admins without one', async () => {
    const volunteer = await makeVolunteer();
    await User.create({ ...base, role: 'VOLUNTEER', volunteer: volunteer._id });
    await assert.rejects(
      User.create({ ...base, email: 'other@example.org', role: 'VOLUNTEER', volunteer: volunteer._id }),
      { code: 11000 }
    );
    await User.create({ ...base, email: 'a1@example.org', role: 'ADMIN', name: 'A1' });
    await User.create({ ...base, email: 'a2@example.org', role: 'ADMIN', name: 'A2' });
  });

  it('never selects or serialises the password hash', async () => {
    const created = await User.create({ ...base, role: 'ADMIN', name: 'Root' });
    const found = await User.findById(created._id);
    assert.equal(found.passwordHash, undefined);

    const withHash = await User.findById(created._id).select('+passwordHash');
    assert.equal(withHash.passwordHash, 'hash');
    const json = withHash.toJSON();
    assert.equal('passwordHash' in json, false);
    assert.equal('tokenVersion' in json, false);
  });

  it('has the expected indexes after init', async () => {
    const indexes = await User.collection.indexes();
    const byName = Object.fromEntries(indexes.map((index) => [index.name, index]));
    assert.equal(byName.email_1.unique, true);
    assert.equal(byName.volunteer_1.unique, true);
    assert.ok(byName.volunteer_1.partialFilterExpression);
  });
});

describe('password utilities', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('correct horse battery');
    assert.notEqual(hash, 'correct horse battery');
    assert.equal(await verifyPassword('correct horse battery', hash), true);
    assert.equal(await verifyPassword('wrong password!!', hash), false);
  });

  it('fails without throwing when the account does not exist', async () => {
    assert.equal(await verifyPassword('anything at all', undefined), false);
  });
});
