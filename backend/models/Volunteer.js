const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  volunteerId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  totalHours: {
    type: Number,
    default: 0
  },
  eventsAttended: {
    type: Number,
    default: 0
  },
  qrCode: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
