const mongoose = require('mongoose');

// A volunteer's profile. Authentication lives on User, and totals (hours,
// activities) are derived from attendance and contribution records, never stored here.
const volunteerSchema = new mongoose.Schema(
  {
    // Human-facing ID such as VOL-2026-0001. Server-generated and immutable;
    // documents reference each other by _id, never by this value.
    volunteerId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: /^VOL-\d{4}-\d{4,}$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
  },
  { timestamps: true }
);

volunteerSchema.index({ name: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);
