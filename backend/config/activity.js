// Activity rules shared by the model, the validators and the service.

const STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'];

const CATEGORIES = ['CLOTHES', 'BOOKS', 'CLEANLINESS', 'FOOD', 'HEALTH', 'ELDERLY_CARE', 'OTHER'];

// The only permitted status changes. CLOSED and CANCELLED are terminal, and a
// CLOSED activity is never reopened.
const TRANSITIONS = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

// Content can change only while the activity is still live.
const EDITABLE_STATUSES = ['DRAFT', 'OPEN'];

const DEFAULT_ATTENDANCE_MINUTES = 30;

const LIMITS = {
  title: { min: 3, max: 120 },
  description: { max: 5000 },
  instructions: { max: 2000 },
  locationName: { max: 120 },
  address: { max: 300 },
  radiusMeters: { min: 25, max: 5000 },
  attendanceMinutes: { min: 0, max: 240 },
  maxDurationMs: 7 * 24 * 60 * 60 * 1000,
};

module.exports = { STATUSES, CATEGORIES, TRANSITIONS, EDITABLE_STATUSES, DEFAULT_ATTENDANCE_MINUTES, LIMITS };
