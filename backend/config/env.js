const path = require('path');
const dotenv = require('dotenv');

// Load backend/.env regardless of the directory the process is started from.
// Variables already set in the environment take precedence over the file.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Required in every environment. Tests use MONGODB_URI_TEST instead of MONGODB_URI.
const REQUIRED = ['JWT_SECRET', ...(isTest ? [] : ['MONGODB_URI'])];
// Required only in production (development falls back to the Vite dev origin).
const REQUIRED_IN_PRODUCTION = ['PUBLIC_APP_URL'];

const missing = [...REQUIRED, ...(isProduction ? REQUIRED_IN_PRODUCTION : [])].filter(
  (name) => !process.env[name] || !process.env[name].trim()
);

if (missing.length > 0) {
  fail(
    `Missing required environment variable(s): ${missing.join(', ')}.\n` +
      'Copy backend/.env.example to backend/.env and set the values.'
  );
}

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  fail('Invalid PORT: it must be an integer between 1 and 65535.');
}

const jwtSecret = process.env.JWT_SECRET.trim();
if (jwtSecret.length < 32) {
  fail('Invalid JWT_SECRET: it must be at least 32 characters. Generate one with: openssl rand -hex 32');
}

// Public origin of the web app. Used to build attendance QR URLs and to validate
// the Origin header on state-changing requests.
const DEV_APP_URL = 'http://localhost:5173';
let publicAppUrl;
try {
  publicAppUrl = new URL(process.env.PUBLIC_APP_URL?.trim() || DEV_APP_URL);
} catch {
  fail('Invalid PUBLIC_APP_URL: it must be an absolute URL such as https://app.example.org');
}
if (isProduction && publicAppUrl.protocol !== 'https:') {
  fail('Invalid PUBLIC_APP_URL: it must use https in production (the auth cookie is Secure).');
}

// Browser origins allowed to make state-changing requests. Development also
// accepts the Vite dev server on either loopback name.
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = [...new Set([publicAppUrl.origin, ...(isProduction ? [] : DEV_ORIGINS)])];

// Number of reverse-proxy hops to trust for req.ip (rate limiting). Unset = none.
function parseTrustProxy(value) {
  if (value === undefined || value.trim() === '' || value.trim() === 'false') return false;
  if (value.trim() === 'true') return true;
  const hops = Number(value);
  if (Number.isInteger(hops) && hops >= 0) return hops;
  return fail('Invalid TRUST_PROXY: use true, false, or a number of proxy hops.');
}

// Largest reported GPS accuracy (metres) a check-in may have. A worse fix says too
// little about where the volunteer is, so it is rejected.
const DEFAULT_MAX_ACCURACY_METERS = 100;
const maxAccuracyMeters =
  process.env.MAX_ACCURACY_METERS === undefined || process.env.MAX_ACCURACY_METERS.trim() === ''
    ? DEFAULT_MAX_ACCURACY_METERS
    : Number(process.env.MAX_ACCURACY_METERS);
if (!Number.isFinite(maxAccuracyMeters) || maxAccuracyMeters <= 0 || maxAccuracyMeters > 1000) {
  fail('Invalid MAX_ACCURACY_METERS: it must be a number greater than 0 and at most 1000.');
}

// Tests must never touch the development database.
const DEFAULT_TEST_URI = 'mongodb://localhost:27017/sevadeep-ngo-test';
const mongoUri = isTest
  ? (process.env.MONGODB_URI_TEST || DEFAULT_TEST_URI).trim()
  : process.env.MONGODB_URI.trim();

// Where contribution photos are written. A small storage module (services/storage.js)
// is the only file that reads this, so local disk can later become object storage
// without the Contribution API or business logic changing. Tests use a separate
// directory so they never leave files behind in the development one.
const DEFAULT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const DEFAULT_UPLOAD_DIR_TEST = path.join(__dirname, '..', 'uploads-test');
const uploadDirRaw = isTest
  ? process.env.UPLOAD_DIR_TEST || DEFAULT_UPLOAD_DIR_TEST
  : process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
const uploadDir = path.isAbsolute(uploadDirRaw) ? uploadDirRaw : path.join(__dirname, '..', uploadDirRaw);

if (isTest) {
  const dbName = new URL(mongoUri).pathname.replace(/^\//, '');
  if (!dbName.endsWith('-test')) {
    fail(`Refusing to run tests against database "${dbName}": the test database name must end in "-test".`);
  }
}

module.exports = {
  nodeEnv,
  isProduction,
  isTest,
  port,
  mongoUri,
  jwtSecret,
  publicAppUrl: publicAppUrl.origin,
  allowedOrigins,
  maxAccuracyMeters,
  uploadDir,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // bcrypt work factor. Low in tests only, to keep the suite fast.
  bcryptRounds: isTest ? 4 : 12,
  rateLimitEnabled: !isTest,
};
