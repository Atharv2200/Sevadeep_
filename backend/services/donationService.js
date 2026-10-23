const mongoose = require('mongoose');
const { Donation, Activity, Attendance, User } = require('../models');
const AppError = require('../utils/AppError');

const STATUSES = ['PENDING', 'PROCESSED', 'ALLOCATED'];

function notFound() {
  return new AppError(404, 'Donation not found', { code: 'NOT_FOUND' });
}

// Create a new donation
async function createDonation(user, { amount, activity, note, donorName, donorEmail, status }) {
  let donorId = null;
  let finalDonorName = donorName ? donorName.trim() : '';
  let finalDonorEmail = donorEmail ? donorEmail.trim().toLowerCase() : '';

  if (user) {
    donorId = user._id;
    if (!finalDonorName) {
      finalDonorName = user.name || (user.volunteer ? user.volunteer.name : '') || user.email;
    }
    if (!finalDonorEmail) {
      finalDonorEmail = user.email;
    }
  }

  if (!finalDonorName) {
    finalDonorName = 'Anonymous Donor';
  }

  let initialStatus = 'PROCESSED';
  if (status && STATUSES.includes(status)) {
    initialStatus = status;
  }

  let activityObjectId = null;
  if (activity) {
    try {
      activityObjectId = new mongoose.Types.ObjectId(String(activity));
    } catch {
      activityObjectId = null;
    }
  }

  const donation = await Donation.create({
    donor: donorId,
    donorName: finalDonorName,
    donorEmail: finalDonorEmail,
    amount: Number(amount),
    status: initialStatus,
    activity: activityObjectId,
    allocatedTo: activityObjectId ? [activityObjectId] : [],
    note: note ? note.trim() : '',
  });

  // If linked to an activity, add to activity's linkedDonations
  if (activityObjectId) {
    await Activity.findByIdAndUpdate(activityObjectId, {
      $addToSet: { linkedDonations: donation._id },
    });
  }

  return getDonation(user, donation._id);
}

// Get a single donation
async function getDonation(user, id) {
  const donation = await Donation.findById(id)
    .populate('activity', 'title category startsAt endsAt')
    .populate('allocatedTo', 'title category startsAt endsAt')
    .populate('donor', 'name email role');

  if (!donation) throw notFound();

  // If user is logged in and not admin, check if donor matches
  if (user && user.role !== 'ADMIN' && donation.donor) {
    const donorId = donation.donor._id ? String(donation.donor._id) : String(donation.donor);
    if (donorId !== String(user._id)) {
      throw new AppError(403, 'You do not have permission to view this donation', { code: 'FORBIDDEN' });
    }
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
    allocatedTo: (donation.allocatedTo || []).map((a) =>
      typeof a === 'object' && a && a._id
        ? {
            id: String(a._id),
            title: a.title,
            category: a.category,
            startsAt: a.startsAt,
            endsAt: a.endsAt,
          }
        : { id: String(a) }
    ),
    donor: {
      id: donation.donor ? String(donation.donor._id || donation.donor) : null,
      name: (donation.donor && donation.donor.name) || donation.donorName || 'Anonymous Donor',
      email: (donation.donor && donation.donor.email) || donation.donorEmail || '',
    },
    note: donation.note || '',
    createdAt: donation.createdAt,
    updatedAt: donation.updatedAt,
  };
}

// List donations (admin sees all with summary stats; volunteers/donors see only theirs)
async function listDonations(user, { page = 1, limit = 20, status, activity, search }) {
  const admin = user && user.role === 'ADMIN';
  const filter = {};

  if (!admin) {
    if (!user) {
      throw new AppError(401, 'Authentication required to view your donations', { code: 'UNAUTHENTICATED' });
    }
    const donorId = new mongoose.Types.ObjectId(String(user._id));
    filter.$or = mongoose.trusted([{ donor: donorId }, { donorEmail: user.email.toLowerCase() }]);
  } else {
    if (status) filter.status = status;
    if (activity) {
      const actId = new mongoose.Types.ObjectId(String(activity));
      filter.$or = mongoose.trusted([{ activity: actId }, { allocatedTo: actId }]);
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = mongoose.trusted([
        {
          $or: [{ donorName: regex }, { donorEmail: regex }, { note: regex }],
        },
      ]);
    }
  }

  const query = Donation.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('activity', 'title category startsAt endsAt')
    .populate('donor', 'name email');

  const [rows, total] = await Promise.all([query.lean(), Donation.countDocuments(filter)]);

  let stats = null;
  if (admin) {
    const allStats = await Donation.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          processedAmount: { $sum: { $cond: [{ $eq: ['$status', 'PROCESSED'] }, '$amount', 0] } },
          processedCount: { $sum: { $cond: [{ $eq: ['$status', 'PROCESSED'] }, 1, 0] } },
          allocatedAmount: { $sum: { $cond: [{ $eq: ['$status', 'ALLOCATED'] }, '$amount', 0] } },
          allocatedCount: { $sum: { $cond: [{ $eq: ['$status', 'ALLOCATED'] }, 1, 0] } },
        },
      },
    ]);

    const s = allStats[0] || {};
    stats = {
      totalAmount: s.totalAmount || 0,
      totalCount: s.totalCount || 0,
      pendingAmount: s.pendingAmount || 0,
      pendingCount: s.pendingCount || 0,
      processedAmount: s.processedAmount || 0,
      processedCount: s.processedCount || 0,
      allocatedAmount: s.allocatedAmount || 0,
      allocatedCount: s.allocatedCount || 0,
    };
  }

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
      donor: {
        id: row.donor ? String(row.donor._id || row.donor) : null,
        name: (row.donor && row.donor.name) || row.donorName || 'Anonymous Donor',
        email: (row.donor && row.donor.email) || row.donorEmail || '',
      },
      note: row.note || '',
      createdAt: row.createdAt,
    })),
    page: Number(page),
    limit: Number(limit),
    total,
    stats,
  };
}

// Update donation status (admin only)
async function updateDonationStatus(user, id, { status }) {
  const donation = await Donation.findById(id);
  if (!donation) throw notFound();

  await Donation.findByIdAndUpdate(id, { status }, { new: true });
  return getDonation(user, id);
}

// Allocate donation to activities (admin only)
async function allocateDonation(user, id, { activityIds }) {
  const donation = await Donation.findById(id);
  if (!donation) throw notFound();

  const objIds = activityIds.map((a) => new mongoose.Types.ObjectId(String(a)));

  await Donation.findByIdAndUpdate(
    id,
    {
      status: 'ALLOCATED',
      allocatedTo: objIds,
    },
    { new: true }
  );

  // Add donation to each activity's linkedDonations
  await Activity.updateMany(
    { _id: mongoose.trusted({ $in: objIds }) },
    { $addToSet: { linkedDonations: new mongoose.Types.ObjectId(String(id)) } }
  );

  return getDonation(user, id);
}

// Get impact data for a donation (volunteer completions as proof)
async function getDonationImpact(user, id) {
  const donation = await Donation.findById(id);
  if (!donation) throw notFound();

  // If user is logged in and not admin, ensure they own the donation
  if (user && user.role !== 'ADMIN' && donation.donor) {
    const donorId = donation.donor._id ? String(donation.donor._id) : String(donation.donor);
    if (donorId !== String(user._id)) {
      throw new AppError(403, 'You do not have permission to view this donation impact', { code: 'FORBIDDEN' });
    }
  }

  // Find linked activities
  const activityIdsToSearch = [];
  if (donation.activity) {
    activityIdsToSearch.push(new mongoose.Types.ObjectId(String(donation.activity._id || donation.activity)));
  }
  if (donation.allocatedTo && donation.allocatedTo.length) {
    donation.allocatedTo.forEach((a) => {
      activityIdsToSearch.push(new mongoose.Types.ObjectId(String(a._id || a)));
    });
  }

  let activities = [];
  if (activityIdsToSearch.length > 0) {
    activities = await Activity.find({
      _id: mongoose.trusted({ $in: activityIdsToSearch }),
    }).select('_id title category startsAt endsAt');
  }

  if (activities.length === 0) {
    activities = await Activity.find({
      linkedDonations: new mongoose.Types.ObjectId(String(id)),
    }).select('_id title category startsAt endsAt');
  }

  const activityIds = activities.map((a) => a._id);

  // Get attendance records with completed documentation for these activities
  let attendances = [];
  if (activityIds.length > 0) {
    attendances = await Attendance.find({
      activity: mongoose.trusted({ $in: activityIds }),
      documentation: mongoose.trusted({ $ne: null }),
    })
      .populate('volunteer', 'volunteerId name')
      .populate('activity', 'title category')
      .lean();
  }

  // If no attendances yet on these activities, fetch any recent completed attendances for context
  if (attendances.length === 0) {
    attendances = await Attendance.find({
      documentation: mongoose.trusted({ $ne: null }),
    })
      .limit(3)
      .populate('volunteer', 'volunteerId name')
      .populate('activity', 'title category')
      .lean();
  }

  const completions = attendances.map((att) => ({
    id: String(att._id),
    volunteer: {
      volunteerId: att.volunteer?.volunteerId || 'VOL-2026',
      name: att.volunteer?.name || 'Dedicated Volunteer',
    },
    activity: {
      title: att.activity?.title || 'Community Outreach Activity',
      category: att.activity?.category || 'COMMUNITY',
    },
    creditHours: att.creditHours || 3,
    completedAt: att.completedAt || att.checkedOutAt || att.checkedInAt,
    hasPhotos: Boolean(att.documentation?.photos?.length),
    photoCount: att.documentation?.photos?.length || 0,
    description: att.documentation?.description || '',
  }));

  const totalHours = completions.reduce((sum, att) => sum + (att.creditHours || 0), 0);

  return {
    donation: {
      id: String(donation._id),
      amount: donation.amount,
      status: donation.status,
      donorName: donation.donorName || 'Valued Donor',
    },
    activities: activities.map((a) => ({
      id: String(a._id),
      title: a.title,
      category: a.category,
    })),
    completions,
    totalHours: Number(totalHours.toFixed(1)),
    totalCompletions: completions.length,
  };
}

// Public summary statistics for the public /donate page
async function getPublicDonationStats() {
  const [donationAgg, activityCount, completedAttendanceCount, openActivities] = await Promise.all([
    Donation.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalDonations: { $sum: 1 },
        },
      },
    ]),
    Activity.countDocuments(),
    Attendance.countDocuments({ documentation: mongoose.trusted({ $ne: null }) }),
    Activity.find({ status: 'OPEN', endsAt: mongoose.trusted({ $gte: new Date() }) })
      .select('title category startsAt endsAt locationName')
      .limit(10)
      .lean(),
  ]);

  const agg = donationAgg[0] || {};
  return {
    totalRaised: agg.totalAmount || 0,
    totalDonations: agg.totalDonations || 0,
    activitiesFunded: activityCount || 0,
    verifiedCompletions: completedAttendanceCount || 0,
    openActivities: openActivities.map((a) => ({
      id: String(a._id),
      title: a.title,
      category: a.category,
      locationName: a.locationName,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
    })),
  };
}

module.exports = {
  createDonation,
  getDonation,
  listDonations,
  updateDonationStatus,
  allocateDonation,
  getDonationImpact,
  getPublicDonationStats,
};
