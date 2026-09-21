const path = require('path');
const dotenv = require('dotenv');

// Load backend/.env regardless of the directory the process is started from.
// Variables already set in the environment take precedence over the file.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Required in every environment.
const REQUIRED = ['MONGODB_URI'];
// Required only in production (development falls back to the Vite dev origins).
const REQUIRED_IN_PRODUCTION = ['CORS_ORIGINS'];

const missing = [...REQUIRED, ...(isProduction ? REQUIRED_IN_PRODUCTION : [])].filter(
  (name) => !process.env[name] || !process.env[name].trim()
);

if (missing.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missing.join(', ')}.\n` +
      'Copy backend/.env.example to backend/.env and set the values.'
  );
  process.exit(1);
}

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Invalid PORT: it must be an integer between 1 and 65535.');
  process.exit(1);
}

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

module.exports = {
  nodeEnv,
  isProduction,
  port,
  mongoUri: process.env.MONGODB_URI.trim(),
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : DEV_ORIGINS,
};
