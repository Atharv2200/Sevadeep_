const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, Volunteer, Activity, Attendance, Contribution, Donation, Counter } = require('../models');
const { hashPassword } = require('../utils/password');

async function getNextVolunteerId() {
  const year = new Date().getUTCFullYear();
  const sequence = await Counter.next(`volunteer:${year}`);
  return `VOL-${year}-${String(sequence).padStart(4, '0')}`;
}

async function seed() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('--- Seeding Users & Volunteers ---');

    // 1. Admin Account
    const adminEmail = 'admin@sevadeep.org';
    const adminPassword = 'AdminPassword123';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const passwordHash = await hashPassword(adminPassword);
      admin = await User.create({
        email: adminEmail,
        passwordHash,
        name: 'Sevadeep Admin',
        role: 'ADMIN',
        mustChangePassword: false,
        status: 'ACTIVE',
      });
      console.log(`✓ Created Admin: ${adminEmail}`);
    } else {
      console.log(`ℹ Admin already exists: ${adminEmail}`);
    }

    // 2. Test Volunteer 1 (Aarav Sharma)
    const vol1Email = 'volunteer@sevadeep.org';
    const vol1Password = 'VolunteerPassword123';
    let vol1User = await User.findOne({ email: vol1Email });
    let vol1Profile;

    if (!vol1User) {
      vol1Profile = await Volunteer.create({
        volunteerId: await getNextVolunteerId(),
        name: 'Aarav Sharma',
        phone: '+91 98765 43210',
      });

      const passwordHash = await hashPassword(vol1Password);
      vol1User = await User.create({
        email: vol1Email,
        passwordHash,
        role: 'VOLUNTEER',
        volunteer: vol1Profile._id,
        status: 'ACTIVE',
      });
      console.log(`✓ Created Volunteer: ${vol1Email} (${vol1Profile.volunteerId})`);
    } else {
      vol1Profile = await Volunteer.findById(vol1User.volunteer);
      console.log(`ℹ Volunteer already exists: ${vol1Email} (${vol1Profile?.volunteerId})`);
    }

    // 3. Test Volunteer 2 (Priya Patel)
    const vol2Email = 'priya@sevadeep.org';
    const vol2Password = 'VolunteerPassword123';
    let vol2User = await User.findOne({ email: vol2Email });
    let vol2Profile;

    if (!vol2User) {
      vol2Profile = await Volunteer.create({
        volunteerId: await getNextVolunteerId(),
        name: 'Priya Patel',
        phone: '+91 98765 43211',
      });

      const passwordHash = await hashPassword(vol2Password);
      vol2User = await User.create({
        email: vol2Email,
        passwordHash,
        role: 'VOLUNTEER',
        volunteer: vol2Profile._id,
        status: 'ACTIVE',
      });
      console.log(`✓ Created Volunteer: ${vol2Email} (${vol2Profile.volunteerId})`);
    } else {
      vol2Profile = await Volunteer.findById(vol2User.volunteer);
      console.log(`ℹ Volunteer already exists: ${vol2Email} (${vol2Profile?.volunteerId})`);
    }

    console.log('--- Seeding Activities ---');
    const existingActivitiesCount = await Activity.countDocuments();
    let activities = [];

    if (existingActivitiesCount === 0) {
      const now = Date.now();
      const HOUR = 3600 * 1000;
      const DAY = 24 * HOUR;

      activities = await Activity.create([
        {
          title: 'Weekly Food Distribution Drive',
          description:
            'Join our community outreach team in packing and distributing fresh, wholesome meal packages to underprivileged families and daily wage workers across central neighborhoods.',
          category: 'FOOD',
          status: 'OPEN',
          startsAt: new Date(now + 2 * HOUR),
          endsAt: new Date(now + 6 * HOUR),
          locationName: 'Dharavi Community Center',
          address: '90 Feet Road, Dharavi, Mumbai 400017',
          latitude: 19.0434,
          longitude: 72.8562,
          radiusMeters: 350,
          creditHours: 4,
          instructions: 'Please wear comfortable footwear and carry a refillable water bottle.',
          createdBy: admin._id,
        },
        {
          title: 'Beach Cleanliness & Ocean Conservation',
          description:
            'Help clear accumulated non-biodegradable debris and plastic waste along the shoreline to restore marine habitat and encourage public cleanliness habits.',
          category: 'CLEANLINESS',
          status: 'OPEN',
          startsAt: new Date(now + 1 * DAY),
          endsAt: new Date(now + 1 * DAY + 4 * HOUR),
          locationName: 'Versova Beachfront',
          address: 'Versova Beach, Andheri West, Mumbai 400061',
          latitude: 19.1352,
          longitude: 72.8138,
          radiusMeters: 400,
          creditHours: 4,
          instructions: 'Bio-degradable collection bags and heavy-duty safety gloves will be provided on site.',
          createdBy: admin._id,
        },
        {
          title: 'Free Health & Dental Screening Camp',
          description:
            'Partnering with volunteer doctors and dentists to provide basic health check-ups, dental check-ups, and free essential medicine distribution.',
          category: 'HEALTH',
          status: 'OPEN',
          startsAt: new Date(now + 3 * DAY),
          endsAt: new Date(now + 3 * DAY + 5 * HOUR),
          locationName: 'Municipal Primary School Ground',
          address: 'Near Station Road, Kurla West, Mumbai 400070',
          latitude: 19.0688,
          longitude: 72.8789,
          radiusMeters: 250,
          creditHours: 5,
          instructions: 'Volunteers will manage token allocation, queue coordination, and registration tables.',
          createdBy: admin._id,
        },
        {
          title: 'Slum Children Book & Stationery Drive',
          description:
            'Collection and sorting of textbooks, stationery kits, drawing materials, and reading books for primary and middle school students.',
          category: 'BOOKS',
          status: 'DRAFT',
          startsAt: new Date(now + 5 * DAY),
          endsAt: new Date(now + 5 * DAY + 3 * HOUR),
          locationName: 'Sevadeep Youth Hub',
          address: 'Sector 4, Nerul, Navi Mumbai 400706',
          latitude: 19.0330,
          longitude: 73.0169,
          radiusMeters: 200,
          creditHours: 3,
          instructions: 'Help inventory and sort donated books by grade level.',
          createdBy: admin._id,
        },
        {
          title: 'Elderly Care & Recreational Afternoon',
          description:
            'Spending quality time with senior citizens, organizing interactive sessions, singing vintage songs, and assisting them with digital phone tasks.',
          category: 'ELDERLY_CARE',
          status: 'CLOSED',
          startsAt: new Date(now - 3 * DAY),
          endsAt: new Date(now - 3 * DAY + 3 * HOUR),
          locationName: 'Anand Ashray Old Age Home',
          address: 'Goregaon East, Mumbai 400063',
          latitude: 19.1663,
          longitude: 72.8526,
          radiusMeters: 150,
          creditHours: 3,
          instructions: 'Be respectful, compassionate, and attentive to residents.',
          createdBy: admin._id,
        },
        {
          title: 'Winter Warmth Clothes & Blanket Drive',
          description:
            'Sorted and packaged warm clothes, woolens, and blankets donated by local residents for distribution to street dwellers and night shelters.',
          category: 'CLOTHES',
          status: 'CLOSED',
          startsAt: new Date(now - 6 * DAY),
          endsAt: new Date(now - 6 * DAY + 4 * HOUR),
          locationName: 'Sevadeep Central NGO Hub',
          address: 'Bandra Kurla Complex, Mumbai 400051',
          latitude: 19.0657,
          longitude: 72.8682,
          radiusMeters: 200,
          creditHours: 4,
          instructions: 'Sort by age group and pack into waterproof distribution sacks.',
          createdBy: admin._id,
        },
      ]);
      console.log(`✓ Seeded ${activities.length} activities (OPEN, DRAFT, CLOSED)`);
    } else {
      activities = await Activity.find().limit(6);
      console.log(`ℹ Found ${existingActivitiesCount} existing activities`);
    }

    console.log('--- Seeding Attendance & Completions ---');
    const existingAttendanceCount = await Attendance.countDocuments();
    const elderlyActivity = activities.find((a) => a.title.includes('Elderly Care')) || activities[4];
    const clothesActivity = activities.find((a) => a.title.includes('Winter Warmth')) || activities[5];

    let att1, att2;
    if (existingAttendanceCount === 0 && elderlyActivity && vol1Profile) {
      const now = Date.now();
      const DAY = 24 * 3600 * 1000;

      // Attendance 1: Aarav attended Elderly Care (Completed)
      att1 = await Attendance.create({
        activity: elderlyActivity._id,
        volunteer: vol1Profile._id,
        checkedInAt: new Date(now - 3 * DAY),
        checkedOutAt: new Date(now - 3 * DAY + 3 * 3600 * 1000),
        checkIn: {
          latitude: elderlyActivity.latitude,
          longitude: elderlyActivity.longitude,
          accuracy: 12,
          distanceMeters: 15,
        },
        checkOut: {
          latitude: elderlyActivity.latitude,
          longitude: elderlyActivity.longitude,
          accuracy: 14,
          distanceMeters: 18,
        },
        creditHours: 3,
        autoApproved: true,
        completedAt: new Date(now - 3 * DAY + 3 * 3600 * 1000),
        documentation: {
          description:
            'Organized a music and storytelling session with residents and helped serving afternoon tea.',
          photos: [
            {
              key: 'seed_elderly_care_proof_1.jpg',
              mimeType: 'image/jpeg',
              size: 245000,
              originalName: 'elderly_activity_photo.jpg',
            },
          ],
          locationEvidence: {
            latitude: elderlyActivity.latitude,
            longitude: elderlyActivity.longitude,
            accuracy: 14,
            distanceMeters: 18,
          },
        },
      });

      // Attendance 2: Priya attended Elderly Care (Completed)
      if (vol2Profile) {
        att2 = await Attendance.create({
          activity: elderlyActivity._id,
          volunteer: vol2Profile._id,
          checkedInAt: new Date(now - 3 * DAY + 15 * 60 * 1000),
          checkedOutAt: new Date(now - 3 * DAY + 2.5 * 3600 * 1000),
          checkIn: {
            latitude: elderlyActivity.latitude,
            longitude: elderlyActivity.longitude,
            accuracy: 10,
            distanceMeters: 10,
          },
          checkOut: {
            latitude: elderlyActivity.latitude,
            longitude: elderlyActivity.longitude,
            accuracy: 11,
            distanceMeters: 12,
          },
          creditHours: 2.5,
          autoApproved: true,
          completedAt: new Date(now - 3 * DAY + 2.5 * 3600 * 1000),
          documentation: {
            description: 'Conducted board game sessions and assisted elderly participants with reading letters.',
            photos: [
              {
                key: 'seed_elderly_care_proof_2.jpg',
                mimeType: 'image/jpeg',
                size: 312000,
                originalName: 'board_games_session.jpg',
              },
            ],
            locationEvidence: {
              latitude: elderlyActivity.latitude,
              longitude: elderlyActivity.longitude,
              accuracy: 11,
              distanceMeters: 12,
            },
          },
        });
      }

      // Attendance 3: Aarav attended Clothes drive
      if (clothesActivity) {
        await Attendance.create({
          activity: clothesActivity._id,
          volunteer: vol1Profile._id,
          checkedInAt: new Date(now - 6 * DAY),
          checkedOutAt: new Date(now - 6 * DAY + 4 * 3600 * 1000),
          checkIn: {
            latitude: clothesActivity.latitude,
            longitude: clothesActivity.longitude,
            accuracy: 15,
            distanceMeters: 20,
          },
          checkOut: {
            latitude: clothesActivity.latitude,
            longitude: clothesActivity.longitude,
            accuracy: 16,
            distanceMeters: 22,
          },
          creditHours: 4,
          autoApproved: true,
          completedAt: new Date(now - 6 * DAY + 4 * 3600 * 1000),
          documentation: {
            description: 'Loaded and transported 20 cartons of winter blankets to the distribution hub.',
            photos: [
              {
                key: 'seed_clothes_drive_proof.jpg',
                mimeType: 'image/jpeg',
                size: 198000,
                originalName: 'blanket_sorting.jpg',
              },
            ],
            locationEvidence: {
              latitude: clothesActivity.latitude,
              longitude: clothesActivity.longitude,
              accuracy: 16,
              distanceMeters: 22,
            },
          },
        });
      }

      console.log('✓ Seeded Attendance and Completion records');
    } else {
      console.log(`ℹ Found ${existingAttendanceCount} existing attendance records`);
    }

    console.log('--- Seeding Contributions ---');
    const existingContributionsCount = await Contribution.countDocuments();
    if (existingContributionsCount === 0 && att1 && elderlyActivity && vol1Profile) {
      await Contribution.create({
        attendance: att1._id,
        volunteer: vol1Profile._id,
        activity: elderlyActivity._id,
        description:
          'Spent the afternoon reading newspapers, conversing with elders, and assisting medical staff.',
        status: 'VERIFIED',
        approvedHours: 3,
        review: {
          reviewedBy: admin._id,
          reviewedAt: new Date(),
          note: 'Thank you for your warm care and patience with the senior residents.',
        },
      });

      if (att2 && vol2Profile) {
        await Contribution.create({
          attendance: att2._id,
          volunteer: vol2Profile._id,
          activity: elderlyActivity._id,
          description:
            'Engaged residents in indoor board games and assisted in distribution of evening refreshments.',
          status: 'PENDING',
        });
      }
      console.log('✓ Seeded Contributions (VERIFIED and PENDING)');
    } else {
      console.log(`ℹ Found ${existingContributionsCount} existing contributions`);
    }

    console.log('--- Seeding Donations ---');
    const existingDonationsCount = await Donation.countDocuments();
    if (existingDonationsCount === 0) {
      const foodActivity = activities.find((a) => a.title.includes('Food')) || activities[0];

      const donation1 = await Donation.create({
        donor: admin._id,
        amount: 15000,
        status: 'ALLOCATED',
        activity: foodActivity?._id || null,
        allocatedTo: foodActivity ? [foodActivity._id] : [],
        note: 'Earmarked for raw grains, pulses, and oil containers for 100 family kits.',
      });

      if (foodActivity) {
        await Activity.updateOne(
          { _id: foodActivity._id },
          { $addToSet: { linkedDonations: donation1._id } }
        );
      }

      await Donation.create({
        donor: vol1User._id,
        amount: 5000,
        status: 'PROCESSED',
        note: 'General fund towards education supplies and book distribution.',
      });

      await Donation.create({
        donor: admin._id,
        amount: 2500,
        status: 'PENDING',
        note: 'Support for safety equipment, gloves, and cleanliness drive gear.',
      });

      console.log('✓ Seeded Donations (ALLOCATED, PROCESSED, PENDING)');
    } else {
      console.log(`ℹ Found ${existingDonationsCount} existing donations`);
    }

    console.log('\n========================================');
    console.log('         SEEDING COMPLETE!              ');
    console.log('========================================');
    console.log('Test Credentials:');
    console.log('----------------------------------------');
    console.log('👑 ADMIN USER:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role:     ADMIN`);
    console.log('----------------------------------------');
    console.log('🙋 VOLUNTEER USER 1:');
    console.log(`   Email:    ${vol1Email}`);
    console.log(`   Password: ${vol1Password}`);
    console.log(`   Name:     Aarav Sharma`);
    console.log(`   ID:       ${vol1Profile?.volunteerId || 'VOL-2026-0001'}`);
    console.log(`   Role:     VOLUNTEER`);
    console.log('----------------------------------------');
    console.log('🙋 VOLUNTEER USER 2:');
    console.log(`   Email:    ${vol2Email}`);
    console.log(`   Password: ${vol2Password}`);
    console.log(`   Name:     Priya Patel`);
    console.log(`   ID:       ${vol2Profile?.volunteerId || 'VOL-2026-0002'}`);
    console.log(`   Role:     VOLUNTEER`);
    console.log('========================================\n');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
