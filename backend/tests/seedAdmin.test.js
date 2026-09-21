const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const { User } = require('../models');
const { seedAdmin } = require('../scripts/seedAdmin');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const details = { name: 'First Admin', email: 'first@example.org', password: 'a-strong-password-1' };

describe('seedAdmin()', () => {
  it('creates the first admin, who can log in without a forced password change', async () => {
    const result = await seedAdmin(details);
    assert.equal(result.created, true);
    assert.equal(result.user.role, 'ADMIN');
    assert.equal(result.user.mustChangePassword, false);
    assert.equal(result.user.volunteer, undefined);

    const agent = await f.loginAs(details.email, details.password);
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.user.role, 'ADMIN');
    assert.equal(me.body.user.name, 'First Admin');
  });

  it('does nothing once an admin exists', async () => {
    await seedAdmin(details);
    const again = await seedAdmin({ ...details, email: 'second@example.org' });
    assert.equal(again.created, false);
    assert.equal(await User.countDocuments({ role: 'ADMIN' }), 1);
  });

  it('is not blocked by volunteers, only by admins', async () => {
    await f.registerVolunteer();
    assert.equal((await seedAdmin(details)).created, true);
  });

  it('rejects weak or malformed details with a readable message', async () => {
    await assert.rejects(seedAdmin({ ...details, password: 'short' }), /password.*at least 10/i);
    await assert.rejects(seedAdmin({ ...details, email: 'nope' }), /email/i);
    await assert.rejects(seedAdmin({ ...details, name: '' }), /name/i);
    assert.equal(await User.countDocuments(), 0);
  });
});

describe('seed:admin script (end to end)', () => {
  const script = path.join(__dirname, '..', 'scripts', 'seedAdmin.js');
  const setup = path.join(__dirname, 'helpers', 'setup.js');
  const run = (env) =>
    spawnSync(process.execPath, ['--require', setup, script], {
      env: { ...process.env, ...env },
      input: '',
      encoding: 'utf8',
    });

  it('creates an admin from environment variables, then reports one already exists', async () => {
    const env = { ADMIN_NAME: 'Env Admin', ADMIN_EMAIL: 'env@example.org', ADMIN_PASSWORD: 'env-password-123' };

    const first = run(env);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Created admin env@example\.org in database "sevadeep-ngo-test"/);
    assert.equal(first.stdout.includes('env-password-123'), false, 'the password is never printed');
    assert.equal(await User.countDocuments({ role: 'ADMIN' }), 1);

    const second = run(env);
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /already exists/);
    assert.equal(await User.countDocuments({ role: 'ADMIN' }), 1);
  });

  it('fails clearly when details are missing and there is no terminal to ask on', () => {
    const res = run({ ADMIN_NAME: '', ADMIN_EMAIL: '', ADMIN_PASSWORD: '' });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD/);
  });

  it('fails without creating anything when the password is weak', async () => {
    const res = run({ ADMIN_NAME: 'A', ADMIN_EMAIL: 'a@example.org', ADMIN_PASSWORD: 'short' });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /at least 10/);
    assert.equal(await User.countDocuments(), 0);
  });
});
