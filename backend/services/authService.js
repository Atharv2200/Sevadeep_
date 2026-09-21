const { Counter, User, Volunteer } = require('../models');
const AppError = require('../utils/AppError');
const { hashPassword, verifyPassword } = require('../utils/password');
const { serializeUser } = require('../utils/serializers');

function emailTaken() {
  return new AppError(409, 'An account with this email already exists', { code: 'EMAIL_TAKEN' });
}

// A duplicate on the unique email index is the authoritative "email taken" answer,
// including when two requests race past any earlier check.
function isDuplicateEmail(err) {
  return err.code === 11000 && Boolean(err.keyPattern?.email);
}

// Server-generated, e.g. VOL-2026-0001. The counter is atomic, so concurrent
// registrations never share a number (a failed registration may leave a gap).
async function nextVolunteerId() {
  const year = new Date().getUTCFullYear();
  const sequence = await Counter.next(`volunteer:${year}`);
  return `VOL-${year}-${String(sequence).padStart(4, '0')}`;
}

// Creates the Volunteer profile and its User account. Without transactions the
// two writes are not atomic, so if the User cannot be created the profile is
// deleted again (compensation) and no orphan is left behind.
async function registerVolunteer({ name, email, phone, password }) {
  if (await User.exists({ email })) throw emailTaken();

  const passwordHash = await hashPassword(password);
  const volunteer = await Volunteer.create({ volunteerId: await nextVolunteerId(), name, phone });

  try {
    return await User.create({ email, passwordHash, role: 'VOLUNTEER', volunteer: volunteer._id });
  } catch (err) {
    await Volunteer.deleteOne({ _id: volunteer._id }).catch((cleanupErr) => {
      console.error(`Could not remove orphan volunteer ${volunteer.volunteerId}: ${cleanupErr.message}`);
    });
    throw isDuplicateEmail(err) ? emailTaken() : err;
  }
}

// Wrong password and unknown email are indistinguishable to the caller. Suspension
// is only revealed after the password is proven correct.
async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordOk = await verifyPassword(password, user?.passwordHash);
  if (!user || !passwordOk) {
    throw new AppError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'This account is suspended', { code: 'ACCOUNT_SUSPENDED' });
  }

  user.lastLoginAt = new Date();
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: user.lastLoginAt } });
  return user;
}

// Changes the password and bumps tokenVersion, which signs out every other session.
// Returns the updated user (its new tokenVersion is what the fresh cookie must carry).
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(400, 'Current password is incorrect', { code: 'INVALID_CURRENT_PASSWORD' });
  }
  if (currentPassword === newPassword) {
    throw new AppError(400, 'New password must be different from the current one', {
      code: 'PASSWORD_UNCHANGED',
    });
  }

  // Conditional on the version we read, so two simultaneous changes cannot both win.
  const result = await User.updateOne(
    { _id: user._id, tokenVersion: user.tokenVersion },
    {
      $set: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
      $inc: { tokenVersion: 1 },
    }
  );
  if (result.modifiedCount !== 1) {
    throw new AppError(409, 'Your password was changed by another request. Please try again.', {
      code: 'CONFLICT',
    });
  }

  user.tokenVersion += 1;
  user.mustChangePassword = false;
  return user;
}

// Admins have no Volunteer profile. Created by the seed script or by another admin
// (who sets a temporary password the new admin must change on first login).
async function createAdmin({ name, email, password, mustChangePassword }) {
  try {
    return await User.create({
      email,
      name,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
      mustChangePassword,
    });
  } catch (err) {
    throw isDuplicateEmail(err) ? emailTaken() : err;
  }
}

// The client-facing description of an account, with the volunteer profile loaded.
async function describeUser(user) {
  const volunteer = user.volunteer ? await Volunteer.findById(user.volunteer) : null;
  return serializeUser(user, volunteer);
}

module.exports = { registerVolunteer, login, changePassword, createAdmin, describeUser };
