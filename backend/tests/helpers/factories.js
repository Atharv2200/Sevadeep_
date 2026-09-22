const request = require('supertest');
const sharp = require('sharp');
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

// Runs `fn(server)` against one real listening server. Use it for tests that fire many
// requests at once: supertest opens a server per request otherwise, and a burst of
// them resets connections.
async function withServer(fn) {
  const server = require('http').createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await fn(server);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
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

const MINUTE = 60 * 1000;
// Metres per degree of latitude on the sphere utils/geo.js uses (R * pi / 180). Moving
// due north by n metres is therefore an exact offset of n / METERS_PER_DEGREE degrees.
const METERS_PER_DEGREE = (6371000 * Math.PI) / 180;

// An OPEN activity whose attendance window is open now (started ten minutes ago).
function openActivity(createdBy, overrides = {}) {
  return seedActivity(createdBy, {
    status: 'OPEN',
    startsAt: new Date(Date.now() - 10 * MINUTE),
    endsAt: new Date(Date.now() + 2 * HOUR),
    ...overrides,
  });
}

// A valid QR token for the activity, made with its stored secret (as the QR endpoint would).
async function qrToken(activityId, now = new Date()) {
  const { Activity } = require('../../models');
  const { createToken } = require('../../services/qrTokenService');
  return createToken(await Activity.findById(activityId).select('+qrSecret'), now);
}

// A position `meters` due north of the activity's venue.
function pointAt(activity, meters = 0) {
  return { latitude: activity.latitude + meters / METERS_PER_DEGREE, longitude: activity.longitude };
}

// A valid check-in body for the activity: at the venue, good accuracy, current token.
async function checkInBody(activity, overrides = {}) {
  return { token: await qrToken(activity._id), ...pointAt(activity, 0), accuracy: 10, ...overrides };
}

// Real, decodable image buffers, generated on the fly instead of checked into the
// repo as fixtures. `withExif` embeds EXIF (including GPS) and an orientation tag,
// so a test can confirm both are gone after processing.
async function jpegBuffer({ width = 20, height = 20, withExif = false } = {}) {
  const image = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } } });
  if (withExif) {
    image.withMetadata({
      exif: { IFD0: { Make: 'TestCam' }, GPS: { GPSLatitude: '12/1,34/1,56/1', GPSLatitudeRef: 'N' } },
      orientation: 6,
    });
  }
  return image.jpeg().toBuffer();
}

function pngBuffer({ width = 20, height = 20 } = {}) {
  return sharp({ create: { width, height, channels: 4, background: { r: 10, g: 200, b: 30, alpha: 0.5 } } })
    .png()
    .toBuffer();
}

function webpBuffer({ width = 20, height = 20 } = {}) {
  return sharp({ create: { width, height, channels: 3, background: { r: 30, g: 30, b: 200 } } })
    .webp()
    .toBuffer();
}

const svgBuffer = () =>
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');

// Not a real image at all; large enough to also double as an "oversized" payload
// when a bigger size is passed.
const garbageBuffer = (bytes = 20) => Buffer.alloc(bytes, 1);

module.exports = {
  HOUR,
  MINUTE,
  METERS_PER_DEGREE,
  openActivity,
  qrToken,
  pointAt,
  checkInBody,
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
  withServer,
  loggedInAdmin,
  cookieHeader,
  tokenFrom,
  jpegBuffer,
  pngBuffer,
  webpBuffer,
  svgBuffer,
  garbageBuffer,
};
