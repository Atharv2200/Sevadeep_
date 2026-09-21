const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { User, Volunteer } = require('../models');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const newAdmin = (overrides = {}) => ({
  name: 'Second Admin',
  email: 'second@example.org',
  temporaryPassword: 'temporary-password-1',
  ...overrides,
});

describe('POST /api/admins', () => {
  it('requires authentication and the ADMIN role', async () => {
    assert.equal((await f.client().post('/api/admins').send(newAdmin())).status, 401);

    const { agent } = await f.registerVolunteer();
    const res = await agent.post('/api/admins').send(newAdmin());
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
    assert.equal(await User.countDocuments({ role: 'ADMIN' }), 0);
  });

  it('lets an admin create another admin who must change the temporary password', async () => {
    const { agent } = await f.loggedInAdmin();
    const res = await agent.post('/api/admins').send(newAdmin({ email: '  Second@Example.ORG ' }));

    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'ADMIN');
    assert.equal(res.body.user.email, 'second@example.org');
    assert.equal(res.body.user.name, 'Second Admin');
    assert.equal(res.body.user.mustChangePassword, true);
    assert.equal(res.body.user.volunteer, null);
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
    assert.equal(JSON.stringify(res.body).includes('temporary-password-1'), false);
    assert.equal(await Volunteer.countDocuments(), 0, 'admins get no volunteer profile');
  });

  it('forces the new admin through a password change before anything else', async () => {
    const { agent } = await f.loggedInAdmin();
    await agent.post('/api/admins').send(newAdmin());

    const second = await f.loginAs('second@example.org', 'temporary-password-1');
    assert.equal((await second.get('/api/auth/me')).status, 200);
    const blocked = await second.post('/api/admins').send(newAdmin({ email: 'third@example.org' }));
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'PASSWORD_CHANGE_REQUIRED');

    const changed = await second
      .post('/api/auth/change-password')
      .send({ currentPassword: 'temporary-password-1', newPassword: 'my-own-new-password' });
    assert.equal(changed.status, 200);
    const allowed = await second.post('/api/admins').send(newAdmin({ email: 'third@example.org' }));
    assert.equal(allowed.status, 201);
  });

  it('rejects a duplicate email, including one used by a volunteer', async () => {
    const { agent } = await f.loggedInAdmin();
    const { payload } = await f.registerVolunteer({ email: 'asha@example.org' });
    const res = await agent.post('/api/admins').send(newAdmin({ email: payload.email }));
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'EMAIL_TAKEN');
  });

  it('validates the name, email and temporary password', async () => {
    const { agent } = await f.loggedInAdmin();
    for (const bad of [{ name: '' }, { email: 'nope' }, { temporaryPassword: 'short' }, { temporaryPassword: 'x'.repeat(73) }]) {
      const res = await agent.post('/api/admins').send(newAdmin(bad));
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
    assert.equal(await User.countDocuments({ role: 'ADMIN' }), 1);
  });

  it('rejects attempts to set server-controlled fields', async () => {
    const { agent } = await f.loggedInAdmin();
    for (const extra of [{ role: 'ADMIN' }, { mustChangePassword: false }, { status: 'ACTIVE' }, { password: 'x'.repeat(12) }, { volunteer: '507f1f77bcf86cd799439011' }]) {
      const res = await agent.post('/api/admins').send({ ...newAdmin(), ...extra });
      assert.equal(res.status, 400, JSON.stringify(extra));
      assert.equal(res.body.errors[0].message, 'Unknown field');
    }
    assert.equal(await User.countDocuments({ role: 'ADMIN' }), 1);
  });

  it('does not allow a suspended-volunteer or logged-out caller to slip through', async () => {
    const { agent, user } = await f.registerVolunteer();
    await User.updateOne({ _id: user.id }, { status: 'SUSPENDED' });
    const res = await agent.post('/api/admins').send(newAdmin());
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
  });
});
