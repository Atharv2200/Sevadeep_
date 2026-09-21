const request = require('supertest');
const app = require('../../app');
const { User } = require('../../models');
const authService = require('../../services/authService');

const PASSWORD = 'correct-horse-battery';

let counter = 0;
function unique(prefix) {
  counter += 1;
  return `${prefix}${counter}`;
}

// A fresh cookie-keeping client; state-changing calls carry the app's Origin like a browser would.
function client() {
  return request.agent(app);
}

function validRegistration(overrides = {}) {
  const n = unique('vol');
  return { name: 'Asha Rao', email: `${n}@example.org`, phone: '+91 98765 43210', password: PASSWORD, ...overrides };
}

// Registers a volunteer through the real endpoint. The returned client stays logged in.
async function registerVolunteer(overrides = {}) {
  const agent = client();
  const payload = validRegistration(overrides);
  const res = await agent.post('/api/auth/register').send(payload);
  if (res.status !== 201) throw new Error(`registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, payload, user: res.body.user };
}

// Creates an admin directly (there is no public admin registration).
async function createAdmin({ email, name = 'Root Admin', password = PASSWORD, mustChangePassword = false } = {}) {
  const user = await authService.createAdmin({
    name,
    email: email || `${unique('admin')}@example.org`,
    password,
    mustChangePassword,
  });
  return { user, password };
}

// Logs an existing account in through the real endpoint and returns the logged-in client.
async function loginAs(email, password = PASSWORD) {
  const agent = client();
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

// Logs in through the real endpoint and returns the raw auth cookie, for use against a stand-in app.
async function loginCookie(email, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return `sevadeep_token=${tokenFrom(res)}`;
}

async function loggedInAdmin(options) {
  const { user, password } = await createAdmin(options);
  return { agent: await loginAs(user.email, password), user, password };
}

function cookieHeader(res) {
  return (res.headers['set-cookie'] || []).find((cookie) => cookie.startsWith('sevadeep_token=')) || null;
}

function tokenFrom(res) {
  const cookie = cookieHeader(res);
  return cookie ? cookie.split(';')[0].split('=')[1] : null;
}

const HOUR = 60 * 60 * 1000;

// A valid create-activity body, starting in two days. Override any field.
function activityPayload(overrides = {}) {
  const start = Date.now() + 48 * HOUR;
  return {
    title: unique('Food drive '),
    description: 'Serving hot meals to families in need.',
    category: 'FOOD',
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 3 * HOUR).toISOString(),
    locationName: 'Community hall',
    address: '12 Temple Road',
    latitude: 18.5204,
    longitude: 73.8567,
    radiusMeters: 100,
    instructions: 'Bring your ID.',
    ...overrides,
  };
}

// Inserts an activity directly, bypassing the API, so any status or time can be set up.
async function seedActivity(createdBy, overrides = {}) {
  const { Activity } = require('../../models');
  const payload = activityPayload(overrides);
  return Activity.create({
    ...payload,
    startsAt: new Date(payload.startsAt),
    endsAt: new Date(payload.endsAt),
    createdBy,
    ...overrides,
  });
}

module.exports = {
  HOUR,
  activityPayload,
  seedActivity,
  PASSWORD,
  User,
  client,
  validRegistration,
  registerVolunteer,
  createAdmin,
  loginAs,
  loginCookie,
  loggedInAdmin,
  cookieHeader,
  tokenFrom,
};
