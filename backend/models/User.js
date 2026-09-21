const mongoose = require('mongoose');

const ROLES = ['VOLUNTEER', 'ADMIN'];
const STATUSES = ['ACTIVE', 'SUSPENDED'];

// Account and authentication state. A VOLUNTEER user points at their Volunteer
// profile; an ADMIN has a name here and no profile.
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    name: { type: String, trim: true, maxlength: 100 },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
    status: { type: String, enum: STATUSES, default: 'ACTIVE' },
    // Set for admins created with a temporary password; cleared on password change.
    mustChangePassword: { type: Boolean, default: false },
    // Bumped to invalidate every token issued before it (e.g. on password change).
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      // Belt and braces: routes build explicit responses, but a stray
      // res.json(user) must still never leak credentials.
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.tokenVersion;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 }, { unique: true });
// One user per volunteer profile. Partial, because admins have none.
userSchema.index(
  { volunteer: 1 },
  { unique: true, partialFilterExpression: { volunteer: { $type: 'objectId' } } }
);
userSchema.index({ role: 1, status: 1 });

userSchema.pre('validate', function checkRoleInvariants(next) {
  if (this.role === 'VOLUNTEER' && !this.volunteer) {
    this.invalidate('volunteer', 'A volunteer user requires a volunteer profile');
  }
  if (this.role === 'ADMIN') {
    if (this.volunteer) this.invalidate('volunteer', 'An admin user cannot have a volunteer profile');
    if (!this.name) this.invalidate('name', 'An admin user requires a name');
  }
  next();
});

const User = mongoose.model('User', userSchema);
User.ROLES = ROLES;
User.STATUSES = STATUSES;

module.exports = User;
