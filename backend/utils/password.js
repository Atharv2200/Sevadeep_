const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { bcryptRounds } = require('../config/env');

function hashPassword(plain) {
  return bcrypt.hash(plain, bcryptRounds);
}

// A real hash of a random value, built once on first use. Comparing against it
// when an account does not exist keeps unknown-email logins as slow as real ones.
let dummyHash;
function getDummyHash() {
  dummyHash ||= bcrypt.hash(crypto.randomBytes(16).toString('hex'), bcryptRounds);
  return dummyHash;
}

// Pass `hash = undefined` for an unknown account: the comparison still runs, then fails.
async function verifyPassword(plain, hash) {
  const matches = await bcrypt.compare(plain, hash || (await getDummyHash()));
  return Boolean(hash) && matches;
}

module.exports = { hashPassword, verifyPassword };
