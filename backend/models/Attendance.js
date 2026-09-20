const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  volunteerId: {
    type: String,
    required: true
  },
  volunteerName: {
    type: String,
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['checked-in', 'completed'],
    default: 'checked-in'
  },
  event: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
