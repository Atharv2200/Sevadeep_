const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { z } = require('zod');

const app = require('../app');
const validate = require('../middleware/validate');
const { errorHandler } = require('../middleware/errorHandler');
const { createLimiter } = require('../middleware/rateLimit');
const AppError = require('../utils/AppError');
const config = require('../config/env');

// A throwaway app that mirrors the real app's query parsing and error handling.
function miniApp(mount) {
  const mini = express();
  mini.set('query parser', 'simple');
  mini.use(express.json());
  mount(mini);
  mini.use(errorHandler);
  return mini;
}

describe('test environment', () => {
  it('runs against the isolated test configuration', () => {
    assert.equal(config.isTest, true);
    assert.match(config.mongoUri, /-test$/);
    assert.equal(config.rateLimitEnabled, false);
  });
});

describe('app basics', () => {
  it('serves the public health check', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('answers unknown routes with the standard error shape', async () => {
    const res = await request(app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.message, 'Route not found');
    assert.equal(res.body.code, 'NOT_FOUND');
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  it('does not enable CORS', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_JSON');
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x'.repeat(200 * 1024) });
    assert.equal(res.status, 413);
    assert.equal(res.body.code, 'PAYLOAD_TOO_LARGE');
  });
});

describe('origin check', () => {
  it('rejects state-changing requests from another origin', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'https://evil.example');
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'INVALID_ORIGIN');
  });

  it('rejects the opaque "null" origin', async () => {
    const res = await request(app).post('/api/auth/logout').set('Origin', 'null');
    assert.equal(res.status, 403);
  });

  it('lets the configured app origin through', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173');
    assert.notEqual(res.status, 403);
  });

  it('lets requests without an Origin header through', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.notEqual(res.status, 403);
  });

  it('does not restrict safe methods', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(res.status, 200);
  });
});

describe('validate middleware', () => {
  const schema = z.strictObject({ name: z.string().min(2) });
  const build = () =>
    miniApp((mini) => {
      mini.post('/x/:id', validate({
        body: schema,
        params: z.strictObject({ id: z.string() }),
        query: z.strictObject({ search: z.string().optional() }),
      }), (req, res) => res.json({ body: req.body, query: req.query }));
      mini.post('/undeclared', validate(), (req, res) => res.json({}));
    });

  it('passes valid input through', async () => {
    const res = await request(build()).post('/x/1?search=a').send({ name: 'Asha' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { body: { name: 'Asha' }, query: { search: 'a' } });
  });

  it('reports invalid fields with the standard error shape', async () => {
    const res = await request(build()).post('/x/1').send({ name: 'A' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.equal(res.body.errors[0].path, 'body.name');
  });

  it('rejects unknown body fields instead of stripping them', async () => {
    const res = await request(build()).post('/x/1').send({ name: 'Asha', role: 'ADMIN' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors, [{ path: 'body.role', message: 'Unknown field' }]);
  });

  it('keeps operator syntax in the query string a plain (rejected) key', async () => {
    const res = await request(build()).post('/x/1?search[$ne]=x').send({ name: 'Asha' });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].path, 'query.search[$ne]');
  });

  it('rejects any input on a route that declares none', async () => {
    const res = await request(build()).post('/undeclared?a=1').send({ b: 2 });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors.length, 2);
  });

  it('rejects a non-object JSON body', async () => {
    const res = await request(build()).post('/x/1').send([1, 2]);
    assert.equal(res.status, 400);
  });
});

describe('error handler', () => {
  const build = () =>
    miniApp((mini) => {
      mini.get('/app-error', (req, res, next) => next(new AppError(418, 'Short and stout', { code: 'TEAPOT' })));
      mini.get('/boom', () => { throw new Error('secret db connection string mongodb://user:pw@host'); });
      mini.get('/duplicate', (req, res, next) => next(Object.assign(new Error('E11000'), { code: 11000 })));
      mini.get('/cast', (req, res, next) => next(Object.assign(new Error('cast'), { name: 'CastError' })));
    });

  it('reports AppError status, message and code', async () => {
    const res = await request(build()).get('/app-error');
    assert.equal(res.status, 418);
    assert.deepEqual(res.body, { message: 'Short and stout', code: 'TEAPOT' });
  });

  it('never leaks internal details on a 500', async () => {
    const res = await request(build()).get('/boom');
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { message: 'Internal server error' });
  });

  it('maps unexpected duplicate-key and cast errors to safe responses', async () => {
    const duplicate = await request(build()).get('/duplicate');
    assert.equal(duplicate.status, 409);
    assert.deepEqual(duplicate.body, { message: 'Duplicate value', code: 'DUPLICATE' });

    const cast = await request(build()).get('/cast');
    assert.equal(cast.status, 400);
    assert.equal(cast.body.message, 'Invalid identifier or value');
  });
});

describe('rate limiter factory', () => {
  const build = (limiter) =>
    miniApp((mini) => {
      mini.get('/limited', limiter, (req, res) => res.json({ ok: true }));
    });

  it('answers 429 with a stable code once the limit is exceeded', async () => {
    const mini = build(createLimiter({ windowMs: 60_000, limit: 2, enabled: true }));
    assert.equal((await request(mini).get('/limited')).status, 200);
    assert.equal((await request(mini).get('/limited')).status, 200);
    const res = await request(mini).get('/limited');
    assert.equal(res.status, 429);
    assert.equal(res.body.code, 'RATE_LIMITED');
  });

  it('is inactive when disabled', async () => {
    const mini = build(createLimiter({ windowMs: 60_000, limit: 1, enabled: false }));
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await request(mini).get('/limited')).status, 200);
    }
  });
});
