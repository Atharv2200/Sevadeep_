const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  volunteerId: {
    type: String,
    required: true
  },
  volunteerName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  event: {
    type: String,
    required: true
  },
  hours: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  submittedDate: {
    type: Date,
    default: Date.now
  },
  verifiedDate: {
    type: Date
  },
  rejectedDate: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contribution', contributionSchema);
