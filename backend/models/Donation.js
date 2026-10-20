const mongoose = require('mongoose');

const STATUSES = ['PENDING', 'PROCESSED', 'ALLOCATED'];

// Tracks donations from donors and their allocation to activities
const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: STATUSES, default: 'PENDING' },
    // Optional: linked to a specific activity at creation time
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
    // Activities this donation has been allocated to (for general donations)
    allocatedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
    note: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

donationSchema.index({ donor: 1, createdAt: -1 });
donationSchema.index({ status: 1 });
donationSchema.index({ activity: 1 });
donationSchema.index({ allocatedTo: 1 });
donationSchema.index({ donor: 1, status: 1 }); // Compound index for donor's donations by status

module.exports = mongoose.model('Donation', donationSchema);
