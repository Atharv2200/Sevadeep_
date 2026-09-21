const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const app = require('../app');
const config = require('../config/env');
const { User, Volunteer } = require('../models');
const validate = require('../middleware/validate');
const { errorHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { buildLimiters } = require('../middleware/rateLimit');
const { login: loginSchema } = require('../validators/auth');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const year = new Date().getUTCFullYear();
const cookieFor = (token) => `sevadeep_token=${token}`;

describe('POST /api/auth/register', () => {
  it('creates the volunteer and user, generates the volunteerId and logs in', async () => {
    const payload = f.validRegistration({ email: 'asha@example.org' });
    const res = await request(app).post('/api/auth/register').send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'asha@example.org');
    assert.equal(res.body.user.role, 'VOLUNTEER');
    assert.equal(res.body.user.status, 'ACTIVE');
    assert.equal(res.body.user.volunteer.volunteerId, `VOL-${year}-0001`);
    assert.equal(res.body.user.volunteer.name, 'Asha Rao');
    assert.equal(res.body.user.name, 'Asha Rao');

    const user = await User.findOne({ email: 'asha@example.org' }).select('+passwordHash');
    const volunteer = await Volunteer.findOne({});
    assert.equal(String(user.volunteer), String(volunteer._id));
    assert.match(user.passwordHash, /^\$2[aby]\$/);
    assert.notEqual(user.passwordHash, payload.password);
  });

  it('never returns credentials or internal fields', async () => {
    const res = await request(app).post('/api/auth/register').send(f.validRegistration());
    const text = JSON.stringify(res.body);
    for (const leaked of ['passwordHash', 'password', 'tokenVersion', '__v']) {
      assert.equal(text.includes(leaked), false, `response leaked ${leaked}`);
    }
  });

  it('sets a hardened cookie holding a minimal token', async () => {
    const res = await request(app).post('/api/auth/register').send(f.validRegistration());
    const cookie = f.cookieHeader(res);
    assert.ok(cookie, 'auth cookie missing');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Path=\/api/);
    assert.doesNotMatch(cookie, /Secure/i, 'Secure is only set in production');

    const payload = jwt.decode(f.tokenFrom(res));
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'sub', 'tv']);
    assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
  });

  it('is logged in immediately after registering', async () => {
    const { agent } = await f.registerVolunteer();
    const me = await agent.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, 'VOLUNTEER');
  });

  it('numbers volunteers sequentially', async () => {
    const first = await f.registerVolunteer();
    const second = await f.registerVolunteer();
    assert.equal(first.user.volunteer.volunteerId, `VOL-${year}-0001`);
    assert.equal(second.user.volunteer.volunteerId, `VOL-${year}-0002`);
  });

  it('gives concurrent registrations distinct ids', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => request(app).post('/api/auth/register').send(f.validRegistration()))
    );
    assert.ok(results.every((res) => res.status === 201));
    const ids = results.map((res) => res.body.user.volunteer.volunteerId).sort();
    assert.equal(new Set(ids).size, 10);
    assert.equal(ids[0], `VOL-${year}-0001`);
    assert.equal(ids[9], `VOL-${year}-0010`);
  });

  it('normalises the email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(f.validRegistration({ email: '  Asha@Example.ORG ' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'asha@example.org');
  });

  it('rejects a duplicate email in any case, without leaving an orphan volunteer', async () => {
    await f.registerVolunteer({ email: 'asha@example.org' });
    const res = await request(app)
      .post('/api/auth/register')
      .send(f.validRegistration({ email: 'ASHA@example.org' }));
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'EMAIL_TAKEN');
    assert.equal(await Volunteer.countDocuments(), 1);
    assert.equal(await User.countDocuments(), 1);
  });

  it('lets exactly one of two simultaneous registrations for one email win, leaving no orphan', async () => {
    const payload = f.validRegistration({ email: 'race@example.org' });
    const results = await Promise.all([
      request(app).post('/api/auth/register').send(payload),
      request(app).post('/api/auth/register').send(payload),
    ]);
    assert.deepEqual(results.map((res) => res.status).sort(), [201, 409]);
    assert.equal(await Volunteer.countDocuments(), 1);
    assert.equal(await User.countDocuments(), 1);
  });

  it('enforces the password rules', async () => {
    const short = await request(app).post('/api/auth/register').send(f.validRegistration({ password: '123456789' }));
    assert.equal(short.status, 400);
    assert.equal(short.body.errors[0].path, 'body.password');

    // 30 characters but 120 bytes: bcrypt would silently truncate this.
    const long = await request(app)
      .post('/api/auth/register')
      .send(f.validRegistration({ password: '\u{1F512}'.repeat(30) }));
    assert.equal(long.status, 400);

    const atLimit = await request(app)
      .post('/api/auth/register')
      .send(f.validRegistration({ password: 'a'.repeat(72) }));
    assert.equal(atLimit.status, 201);
  });

  it('validates name, email and phone', async () => {
    for (const bad of [{ name: '   ' }, { email: 'not-an-email' }, { phone: 'call me' }, { phone: '12' }]) {
      const res = await request(app).post('/api/auth/register').send(f.validRegistration(bad));
      assert.equal(res.status, 400, JSON.stringify(bad));
      assert.equal(res.body.code, 'VALIDATION_ERROR');
    }
    assert.equal(await User.countDocuments(), 0);
  });

  it('rejects mass-assignment of server-controlled fields', async () => {
    const forbidden = {
      role: 'ADMIN',
      status: 'ACTIVE',
      volunteerId: 'VOL-2000-0001',
      volunteer: '507f1f77bcf86cd799439011',
      tokenVersion: 5,
      mustChangePassword: false,
      passwordHash: 'x',
    };
    for (const [field, value] of Object.entries(forbidden)) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...f.validRegistration(), [field]: value });
      assert.equal(res.status, 400, field);
      assert.equal(res.body.errors[0].message, 'Unknown field');
    }
    assert.equal(await User.countDocuments(), 0);
    assert.equal(await Volunteer.countDocuments(), 0);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in, sets the cookie and records lastLoginAt', async () => {
    const { payload } = await f.registerVolunteer({ email: 'asha@example.org' });
    const res = await request(app).post('/api/auth/login').send({ email: 'ASHA@example.org ', password: payload.password });
    assert.equal(res.status, 200);
    assert.ok(f.cookieHeader(res));
    assert.equal(res.body.user.volunteer.name, 'Asha Rao');
    assert.ok(res.body.user.lastLoginAt);
    assert.ok((await User.findOne({ email: 'asha@example.org' })).lastLoginAt);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const { payload } = await f.registerVolunteer({ email: 'asha@example.org' });
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: payload.email, password: 'wrong-password-1' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.org', password: 'wrong-password-1' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
    assert.equal(wrongPassword.body.code, 'INVALID_CREDENTIALS');
    assert.equal(f.cookieHeader(wrongPassword), null);
  });

  it('blocks suspended accounts, revealing suspension only to someone who knows the password', async () => {
    const { payload } = await f.registerVolunteer({ email: 'asha@example.org' });
    await User.updateOne({ email: payload.email }, { status: 'SUSPENDED' });

    const right = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    assert.equal(right.status, 403);
    assert.equal(right.body.code, 'ACCOUNT_SUSPENDED');
    assert.equal(f.cookieHeader(right), null);

    const wrong = await request(app).post('/api/auth/login').send({ email: payload.email, password: 'wrong-password-1' });
    assert.equal(wrong.status, 401);
  });

  it('rejects unknown fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x', role: 'ADMIN' });
    assert.equal(res.status, 400);
  });

  it('logs in admins too', async () => {
    const { agent } = await f.loggedInAdmin({ email: 'root@example.org', name: 'Root Admin' });
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.user.role, 'ADMIN');
    assert.equal(me.body.user.name, 'Root Admin');
    assert.equal(me.body.user.volunteer, null);
  });
});

describe('sessions (GET /api/auth/me)', () => {
  const validClaims = async () => {
    const { user } = await f.createAdmin({ email: 'root@example.org' });
    return { sub: String(user._id), tv: user.tokenVersion };
  };
  const get = (token) => request(app).get('/api/auth/me').set('Cookie', cookieFor(token));

  it('requires a cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHENTICATED');
  });

  it('accepts a correctly signed token', async () => {
    const { sub, tv } = await validClaims();
    const res = await get(jwt.sign({ tv }, config.jwtSecret, { subject: sub, expiresIn: 60 }));
    assert.equal(res.status, 200);
  });

  it('rejects garbage, wrong-secret, expired, unsigned and wrong-algorithm tokens', async () => {
    const { sub, tv } = await validClaims();
    const good = { subject: sub, expiresIn: 60 };
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub, tv })).toString('base64url')}.`;

    const attempts = {
      garbage: 'not-a-token',
      'wrong secret': jwt.sign({ tv }, 'a-completely-different-secret-value-0123456789', good),
      expired: jwt.sign({ tv }, config.jwtSecret, { subject: sub, expiresIn: -10 }),
      'alg none': unsigned,
      'wrong algorithm': jwt.sign({ tv }, config.jwtSecret, { ...good, algorithm: 'HS512' }),
    };
    for (const [label, token] of Object.entries(attempts)) {
      const res = await get(token);
      assert.equal(res.status, 401, label);
      assert.equal(res.body.code, 'INVALID_SESSION', label);
    }
  });

  it('rejects tokens for a missing user, a malformed subject, a stale or absent tokenVersion', async () => {
    const { sub, tv } = await validClaims();
    const sign = (claims, subject) => jwt.sign(claims, config.jwtSecret, { subject, expiresIn: 60 });

    assert.equal((await get(sign({ tv }, '507f1f77bcf86cd799439011'))).status, 401, 'deleted user');
    assert.equal((await get(sign({ tv }, 'not-an-object-id'))).status, 401, 'malformed subject');
    assert.equal((await get(sign({ tv: tv + 1 }, sub))).status, 401, 'stale version');
    assert.equal((await get(sign({}, sub))).status, 401, 'no version');
  });

  it('applies suspension immediately to an existing session', async () => {
    const { agent, user } = await f.registerVolunteer();
    assert.equal((await agent.get('/api/auth/me')).status, 200);

    await User.updateOne({ _id: user.id }, { status: 'SUSPENDED' });
    const res = await agent.get('/api/auth/me');
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
  });

  it('keeps the historical profile when an account is suspended', async () => {
    const { user } = await f.registerVolunteer();
    await User.updateOne({ _id: user.id }, { status: 'SUSPENDED' });
    assert.equal(await Volunteer.countDocuments(), 1);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie and ends the browser session', async () => {
    const { agent } = await f.registerVolunteer();
    const res = await agent.post('/api/auth/logout');
    assert.equal(res.status, 204);
    assert.match(f.cookieHeader(res), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await agent.get('/api/auth/me')).status, 401);
  });

  it('succeeds when nobody is logged in', async () => {
    assert.equal((await request(app).post('/api/auth/logout')).status, 204);
  });
});

describe('POST /api/auth/change-password', () => {
  const NEW_PASSWORD = 'a-brand-new-password';

  it('requires authentication', async () => {
    const res = await request(app).post('/api/auth/change-password').send({ currentPassword: 'x', newPassword: NEW_PASSWORD });
    assert.equal(res.status, 401);
  });

  it('rejects a wrong current password and an unchanged password', async () => {
    const { agent, payload } = await f.registerVolunteer();
    const wrong = await agent.post('/api/auth/change-password').send({ currentPassword: 'wrong-password-1', newPassword: NEW_PASSWORD });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.code, 'INVALID_CURRENT_PASSWORD');

    const same = await agent.post('/api/auth/change-password').send({ currentPassword: payload.password, newPassword: payload.password });
    assert.equal(same.status, 400);
    assert.equal(same.body.code, 'PASSWORD_UNCHANGED');
  });

  it('applies the password rules to the new password', async () => {
    const { agent, payload } = await f.registerVolunteer();
    const res = await agent.post('/api/auth/change-password').send({ currentPassword: payload.password, newPassword: 'short' });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].path, 'body.newPassword');
  });

  it('changes the password, keeps this session and signs every other session out', async () => {
    const { agent, payload } = await f.registerVolunteer({ email: 'asha@example.org' });
    const otherDevice = await f.loginAs(payload.email, payload.password);
    assert.equal((await otherDevice.get('/api/auth/me')).status, 200);

    const res = await agent.post('/api/auth/change-password').send({ currentPassword: payload.password, newPassword: NEW_PASSWORD });
    assert.equal(res.status, 200);
    assert.ok(f.cookieHeader(res), 'a fresh cookie is issued');

    assert.equal((await agent.get('/api/auth/me')).status, 200, 'this session survives');
    const stale = await otherDevice.get('/api/auth/me');
    assert.equal(stale.status, 401, 'other sessions are invalidated');

    const oldLogin = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    assert.equal(oldLogin.status, 401);
    const newLogin = await request(app).post('/api/auth/login').send({ email: payload.email, password: NEW_PASSWORD });
    assert.equal(newLogin.status, 200);
  });

  it('clears mustChangePassword', async () => {
    const { user, password } = await f.createAdmin({ mustChangePassword: true });
    const agent = await f.loginAs(user.email, password);
    assert.equal((await agent.get('/api/auth/me')).body.user.mustChangePassword, true);

    const res = await agent.post('/api/auth/change-password').send({ currentPassword: password, newPassword: NEW_PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.mustChangePassword, false);
  });
});

describe('authenticate and requireRole', () => {
  // A throwaway app with one route per protection level.
  const build = () => {
    const mini = express();
    mini.use(require('cookie-parser')());
    mini.get('/any', authenticate, (req, res) => res.json({ ok: true }));
    mini.get('/admin', authenticate, requireRole('ADMIN'), (req, res) => res.json({ ok: true }));
    mini.use(errorHandler);
    return mini;
  };

  it('blocks a user with a pending password change from everything else', async () => {
    const { user, password } = await f.createAdmin({ mustChangePassword: true });
    const agent = await f.loginAs(user.email, password);

    const blocked = await request(build()).get('/admin').set('Cookie', await f.loginCookie(user.email, password));
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'PASSWORD_CHANGE_REQUIRED');

    const newPassword = 'a-brand-new-password';
    await agent.post('/api/auth/change-password').send({ currentPassword: password, newPassword });
    const allowed = await request(build()).get('/admin').set('Cookie', await f.loginCookie(user.email, newPassword));
    assert.equal(allowed.status, 200);
  });

  it('lets any authenticated role through /any but only ADMIN through /admin', async () => {
    const volunteer = await f.registerVolunteer();
    const admin = await f.createAdmin();
    const volunteerCookie = await f.loginCookie(volunteer.payload.email, volunteer.payload.password);
    const adminCookie = await f.loginCookie(admin.user.email, admin.password);

    assert.equal((await request(build()).get('/any')).status, 401);
    assert.equal((await request(build()).get('/any').set('Cookie', volunteerCookie)).status, 200);

    const asVolunteer = await request(build()).get('/admin').set('Cookie', volunteerCookie);
    assert.equal(asVolunteer.status, 403);
    assert.equal(asVolunteer.body.code, 'FORBIDDEN');
    assert.equal((await request(build()).get('/admin').set('Cookie', adminCookie)).status, 200);
  });
});

describe('login rate limiting', () => {
  // The real limiter set, switched on, in front of a stand-in login handler.
  const build = () => {
    const limiters = buildLimiters(true);
    const mini = express();
    mini.set('query parser', 'simple');
    mini.use(express.json());
    mini.post('/login', validate({ body: loginSchema }), limiters.loginByIp, limiters.loginByAccount, (req, res) =>
      req.body.password === 'right-password' ? res.json({ ok: true }) : res.status(401).json({ message: 'no' })
    );
    mini.use(errorHandler);
    return mini;
  };
  const attempt = (mini, email, password) => request(mini).post('/login').send({ email, password });

  it('locks an account for a client after 10 failed attempts, but not other accounts', async () => {
    const mini = build();
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await attempt(mini, 'a@example.org', 'wrong')).status, 401);
    }
    const locked = await attempt(mini, 'a@example.org', 'wrong');
    assert.equal(locked.status, 429);
    assert.equal(locked.body.code, 'RATE_LIMITED');
    assert.equal((await attempt(mini, 'b@example.org', 'wrong')).status, 401);
  });

  it('does not count successful logins', async () => {
    const mini = build();
    for (let i = 0; i < 15; i += 1) {
      assert.equal((await attempt(mini, 'a@example.org', 'right-password')).status, 200);
    }
  });
});
