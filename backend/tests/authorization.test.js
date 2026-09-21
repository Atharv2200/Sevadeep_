const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const db = require('./helpers/db');
const f = require('./helpers/factories');
const app = require('../app');

before(db.connect);
after(db.disconnect);
beforeEach(db.reset);

const ANY = ['anonymous', 'VOLUNTEER', 'ADMIN'];
const AUTHENTICATED = ['VOLUNTEER', 'ADMIN'];
const OBJECT_ID = '507f1f77bcf86cd799439011';

// Every route and who may call it. Adding a route without listing it here fails
// the "matrix covers every route" test below, so access rules cannot be forgotten.
const MATRIX = [
  ['GET /api/health', ANY],
  ['POST /api/auth/register', ANY],
  ['POST /api/auth/login', ANY],
  ['POST /api/auth/logout', ANY],
  ['GET /api/auth/me', AUTHENTICATED],
  ['POST /api/auth/change-password', AUTHENTICATED],
  ['POST /api/admins', ['ADMIN']],
  ['GET /api/volunteers/me', ['VOLUNTEER']],
  ['PATCH /api/volunteers/me', ['VOLUNTEER']],
  ['GET /api/volunteers', ['ADMIN']],
  ['GET /api/volunteers/:id', ['ADMIN']],
  ['PATCH /api/volunteers/:id/status', ['ADMIN']],
  ['GET /api/activities', AUTHENTICATED],
  ['GET /api/activities/:id', AUTHENTICATED],
  ['POST /api/activities', ['ADMIN']],
  ['PATCH /api/activities/:id', ['ADMIN']],
  ['PATCH /api/activities/:id/status', ['ADMIN']],
  ['GET /api/activities/:id/qr', ['ADMIN']],
  ['GET /api/activities/:id/attendance', ['ADMIN']],
  ['POST /api/activities/:id/attendance', ['VOLUNTEER']],
  ['POST /api/activities/:id/attendance/check-out', ['VOLUNTEER']],
  ['GET /api/attendance', AUTHENTICATED],
];

// Lists every route registered on the Express app as "METHOD /full/path".
function registeredRoutes() {
  const found = [];
  // Turns a router's mount regexp back into its path, restoring ":param" segments.
  const mountPath = (layer) => {
    let keyIndex = 0;
    return layer.regexp.source
      .replace('\\/?(?=\\/|$)', '')
      .replace(/^\^/, '')
      .replace(/\(\?:\\\/\(\[\^\/\]\+\?\)\)/g, () => `/:${layer.keys[keyIndex++].name}`)
      .replace(/\\\//g, '/');
  };
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) {
          found.push(`${method.toUpperCase()} ${prefix}${layer.route.path === '/' ? '' : layer.route.path}`);
        }
      } else if (layer.name === 'router' && layer.handle.stack) {
        walk(layer.handle.stack, prefix + mountPath(layer));
      }
    }
  };
  walk(app._router.stack, '');
  return found;
}

describe('authorization matrix', () => {
  it('covers every registered route', () => {
    assert.deepEqual(registeredRoutes().sort(), MATRIX.map(([route]) => route).sort());
  });

  it('answers 401 to anonymous callers, 403 to the wrong role, and lets the right role through', async () => {
    const volunteer = await f.registerVolunteer();
    const admin = await f.createAdmin();
    // A fresh session per call: some routes (logout, change-password) alter the session.
    const callers = {
      anonymous: async () => f.client(),
      VOLUNTEER: async () => f.loginAs(volunteer.payload.email, volunteer.payload.password),
      ADMIN: async () => f.loginAs(admin.user.email, admin.password),
    };

    for (const [route, allowed] of MATRIX) {
      const [method, template] = route.split(' ');
      const path = template.replace(':id', OBJECT_ID);

      for (const [role, session] of Object.entries(callers)) {
        const res = await (await session())[method.toLowerCase()](path).send({});
        const expectation = allowed.includes(role) ? 'allowed' : role === 'anonymous' ? 401 : 403;
        if (expectation === 'allowed') {
          assert.ok(![401, 403].includes(res.status), `${role} ${route} should be allowed, got ${res.status}`);
        } else {
          assert.equal(res.status, expectation, `${role} ${route}`);
        }
      }
    }
  });

  it('blocks suspended accounts from every protected route', async () => {
    const volunteer = await f.registerVolunteer();
    await f.User.updateOne({ _id: volunteer.user.id }, { status: 'SUSPENDED' });

    for (const [route, allowed] of MATRIX) {
      if (!allowed.includes('VOLUNTEER') || allowed.includes('anonymous')) continue;
      const [method, template] = route.split(' ');
      const res = await volunteer.agent[method.toLowerCase()](template.replace(':id', OBJECT_ID)).send({});
      assert.equal(res.status, 403, route);
      assert.equal(res.body.code, 'ACCOUNT_SUSPENDED', route);
    }
  });
});
