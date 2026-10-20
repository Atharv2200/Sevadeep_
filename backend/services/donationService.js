const { Donation, Activity, Attendance } = require('../models');
const AppError = require('../utils/AppError');

const STATUSES = ['PENDING', 'PROCESSED', 'ALLOCATED'];

function notFound() {
  return new AppError(404, 'Donation not found', { code: 'NOT_FOUND' });
}

// Create a new donation
async function createDonation(user, { amount, activity, note }) {
  const donation = await Donation.create({
    donor: user._id,
    amount,
    activity: activity || null,
    note: note || '',
  });

  // If linked to an activity, add to activity's linkedDonations
  if (activity) {
    await Activity.findByIdAndUpdate(activity, {
      $push: { linkedDonations: donation._id },
    });
  }

  return getDonation(user, donation._id);
}

// Get a single donation
async function getDonation(user, id) {
  const donation = await Donation.findById(id).populate('activity', 'title category startsAt endsAt');
  if (!donation) throw notFound();

  // Only donor or admin can view
  if (user.role !== 'ADMIN' && String(donation.donor) !== String(user._id)) {
    throw new AppError(403, 'You do not have permission to view this donation', { code: 'FORBIDDEN' });
  }

  return {
    id: String(donation._id),
    amount: donation.amount,
    status: donation.status,
    activity: donation.activity
      ? {
          id: String(donation.activity._id),
          title: donation.activity.title,
          category: donation.activity.category,
          startsAt: donation.activity.startsAt,
          endsAt: donation.activity.endsAt,
        }
      : null,
    allocatedTo: donation.allocatedTo,
    note: donation.note,
    createdAt: donation.createdAt,
    updatedAt: donation.updatedAt,
  };
}

// List donations (admin sees all, donors see only theirs)
async function listDonations(user, { page, limit, status, activity }) {
  const admin = user.role === 'ADMIN';
  const filter = admin ? {} : { donor: user._id };
  if (status) filter.status = status;
  if (activity) filter.activity = activity;

  const query = Donation.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('activity', 'title category startsAt endsAt');

  const [rows, total] = await Promise.all([
    admin ? query.populate('donor', 'name email') : query.lean(),
    Donation.countDocuments(filter),
  ]);

  return {
    items: rows.map((row) => ({
      id: String(row._id),
      amount: row.amount,
      status: row.status,
      activity: row.activity
        ? {
            id: String(row.activity._id),
            title: row.activity.title,
            category: row.activity.category,
          }
        : null,
      donor: admin && row.donor ? { id: String(row.donor._id), name: row.donor.name, email: row.donor.email } : null,
      createdAt: row.createdAt,
    })),
    page,
    limit,
    total,
  };
}

// Update donation status (admin only)
async function updateDonationStatus(user, id, { status }) {
  const donation = await Donation.findById(id);
  if (!donation) throw notFound();

  const updated = await Donation.findByIdAndUpdate(id, { status }, { new: true });
  return getDonation(user, id);
}

// Allocate donation to activities (admin only)
async function allocateDonation(user, id, { activityIds }) {
  const donation = await Donation.findById(id);
  if (!donation) throw notFound();

  if (donation.status === 'ALLOCATED') {
    throw new AppError(409, 'This donation has already been allocated', { code: 'ALREADY_ALLOCATED' });
  }

  const updated = await Donation.findByIdAndUpdate(
    id,
    {
      status: 'ALLOCATED',
      allocatedTo: activityIds,
    },
    { new: true }
  );

  // Add donation to each activity's linkedDonations
  await Activity.updateMany({ _id: { $in: activityIds } }, { $push: { linkedDonations: id } });

  return getDonation(user, id);
}

// Get impact data for a donation (volunteer completions as proof)
async function getDonationImpact(user, id) {
  const donation = await Donation.findById(id);
  if (!donation) throw notFound();

  // Only donor or admin can view impact
  if (user.role !== 'ADMIN' && String(donation.donor) !== String(user._id)) {
    throw new AppError(403, 'You do not have permission to view this donation', { code: 'FORBIDDEN' });
  }

  // Get activities linked to this donation
  const activities = await Activity.find({ linkedDonations: id }).select('_id title category');

  // Get attendance records (completions) for these activities
  const activityIds = activities.map((a) => a._id);
  const attendances = await Attendance.find({
    activity: { $in: activityIds },
    documentation: { $ne: null },
  })
    .populate('volunteer', 'volunteerId name')
    .populate('activity', 'title category')
    .lean();

  return {
    donation: {
      id: String(donation._id),
      amount: donation.amount,
      status: donation.status,
    },
    activities: activities.map((a) => ({
      id: String(a._id),
      title: a.title,
      category: a.category,
    })),
    completions: attendances.map((att) => ({
      id: String(att._id),
      volunteer: { volunteerId: att.volunteer.volunteerId, name: att.volunteer.name },
      activity: { title: att.activity.title, category: att.activity.category },
      creditHours: att.creditHours,
      completedAt: att.completedAt,
      hasPhotos: att.documentation?.photos?.length > 0,
      photoCount: att.documentation?.photos?.length || 0,
    })),
    totalHours: attendances.reduce((sum, att) => sum + (att.creditHours || 0), 0),
    totalCompletions: attendances.length,
  };
}

module.exports = {
  createDonation,
  getDonation,
  listDonations,
  updateDonationStatus,
  allocateDonation,
  getDonationImpact,
};
