// Creates the first admin account. This is the only way to get an ADMIN without
// already being one; afterwards admins create further admins through POST /api/admins.
//
// Usage (from backend/):  npm run seed:admin
// Values come from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD when set, otherwise the
// script asks for them (the password is not echoed). Prefer the prompt on a shared
// machine: variables set on the command line can end up in shell history.
// Running it again is safe: it does nothing once an admin exists.

const readline = require('readline');
const mongoose = require('mongoose');
const { z } = require('zod');
const { mongoUri } = require('../config/env');
const connectDB = require('../config/db');
const { User } = require('../models');
const authService = require('../services/authService');
const { name, email, newPassword } = require('../validators/common');

const adminInput = z.strictObject({ name, email, password: newPassword });

// Creates the first admin unless one exists. Returns { created, user? }.
async function seedAdmin(input) {
  const parsed = adminInput.safeParse(input);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid admin details - ${problems.join('; ')}`);
  }

  if (await User.exists({ role: 'ADMIN' })) return { created: false };

  // The person running the script chose this password themselves, so no forced change.
  const user = await authService.createAdmin({ ...parsed.data, mustChangePassword: false });
  return { created: true, user };
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    // readline has no built-in "do not echo"; suppress everything written after the prompt.
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (text) => {
      if (!muted) write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

async function collectInput() {
  const provided = {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };
  if (provided.name && provided.email && provided.password) return provided;

  if (!process.stdin.isTTY) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD, or run this in an interactive terminal.');
  }

  const input = {
    name: provided.name || (await ask('Admin name: ')),
    email: provided.email || (await ask('Admin email: ')),
    password: provided.password,
  };
  if (!input.password) {
    input.password = await ask('Password (min 10 characters): ', { hidden: true });
    const again = await ask('Repeat password: ', { hidden: true });
    if (input.password !== again) throw new Error('The passwords do not match.');
  }
  return input;
}

async function main() {
  try {
    const input = await collectInput();
    await connectDB();
    const { created, user } = await seedAdmin(input);
    const database = new URL(mongoUri).pathname.replace(/^\//, '');
    if (created) {
      console.log(`Created admin ${user.email} in database "${database}".`);
    } else {
      console.log(`An admin already exists in database "${database}"; nothing to do.`);
      console.log('Additional admins are created by an existing admin (POST /api/admins).');
    }
  } catch (err) {
    console.error(`seed:admin failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) main();

module.exports = { seedAdmin };
