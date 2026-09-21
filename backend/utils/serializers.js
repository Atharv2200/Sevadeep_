// Explicit response shapes. Fields are listed one by one, so a column added to a
// model later is never exposed to clients by accident.

function serializeVolunteer(volunteer) {
  return {
    id: String(volunteer._id),
    volunteerId: volunteer.volunteerId,
    name: volunteer.name,
    phone: volunteer.phone,
    joinedAt: volunteer.createdAt,
  };
}

// `volunteer` is the loaded profile for VOLUNTEER users and null for admins.
function serializeUser(user, volunteer = null) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name ?? volunteer?.name ?? null,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt ?? null,
    volunteer: volunteer ? serializeVolunteer(volunteer) : null,
  };
}

module.exports = { serializeVolunteer, serializeUser };
