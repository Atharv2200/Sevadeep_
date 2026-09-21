// Loaded with `node --require` before any test file, so the configuration is
// resolved for the test environment before config/env.js is first required.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-0123456789';
process.env.PUBLIC_APP_URL = 'http://localhost:5173';
delete process.env.TRUST_PROXY;
