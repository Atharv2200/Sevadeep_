// Server-shaped activity, as the API returns it. Times are UTC ISO strings.
export function activity(n = 1, overrides = {}) {
  return {
    id: `act${n}`,
    title: `Activity ${n}`,
    description: `Description of activity ${n}.`,
    category: 'FOOD',
    status: 'OPEN',
    startsAt: '2031-05-01T09:00:00.000Z',
    endsAt: '2031-05-01T12:00:00.000Z',
    locationName: `Venue ${n}`,
    address: '12 Temple Road',
    latitude: 18.5204,
    longitude: 73.8567,
    radiusMeters: 100,
    instructions: '',
    attendance: { opensAt: '2031-05-01T08:30:00.000Z', closesAt: '2031-05-01T12:30:00.000Z', isOpen: false },
    createdAt: '2031-01-01T00:00:00.000Z',
    updatedAt: '2031-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// The admin view adds the creator, the window settings and the allowed transitions.
export function adminActivity(n = 1, overrides = {}) {
  return activity(n, {
    attendanceOpensMinutesBefore: 30,
    attendanceClosesMinutesAfter: 30,
    createdBy: { id: 'u-admin', name: 'Root Admin' },
    allowedTransitions: ['CLOSED', 'CANCELLED'],
    ...overrides,
  })
}

export const listBody = (items, total = items.length, page = 1, limit = 12) => ({ body: { items, page, limit, total } })

// An attendance record as a volunteer sees it: times and duration, nothing about position.
export function attendanceRecord(n = 1, overrides = {}) {
  return {
    id: `att${n}`,
    checkedInAt: '2031-05-01T09:05:00.000Z',
    checkedOutAt: null,
    durationMinutes: null,
    activity: {
      id: `act${n}`,
      title: `Activity ${n}`,
      category: 'FOOD',
      locationName: `Venue ${n}`,
      startsAt: '2031-05-01T09:00:00.000Z',
      endsAt: '2031-05-01T12:00:00.000Z',
      status: 'OPEN',
    },
    ...overrides,
  }
}

// An attendance record as an admin sees it: who, evidence and flags.
export function adminAttendance(n = 1, overrides = {}) {
  return {
    ...attendanceRecord(n),
    volunteer: { id: `vol${n}`, volunteerId: `VOL-2031-000${n}`, name: `Volunteer ${n}` },
    checkIn: { latitude: 18.52, longitude: 73.85, accuracy: 12, distanceMeters: 34.5 },
    checkOut: null,
    flags: [],
    ...overrides,
  }
}

export const emptyPage = { body: { items: [], page: 1, limit: 1, total: 0 } }

// A contribution as a volunteer sees it: their own submission, and the outcome once
// reviewed. `activity` and `attendance` are summaries; only VERIFIED carries hours.
export function contribution(n = 1, overrides = {}) {
  return {
    id: `con${n}`,
    description: `Helped set up and serve at activity ${n}.`,
    status: 'PENDING',
    approvedHours: null,
    suggestedHours: null,
    revision: 0,
    review: { reviewedAt: null, note: '' },
    activity: {
      id: `act${n}`,
      title: `Activity ${n}`,
      category: 'FOOD',
      startsAt: '2031-05-01T09:00:00.000Z',
      endsAt: '2031-05-01T12:00:00.000Z',
    },
    attendance: { id: `att${n}`, checkedInAt: '2031-05-01T09:05:00.000Z', checkedOutAt: null },
    createdAt: '2031-05-01T09:10:00.000Z',
    updatedAt: '2031-05-01T09:10:00.000Z',
    ...overrides,
  }
}

// The admin view adds who submitted it and (once reviewed) who reviewed it.
export function adminContribution(n = 1, overrides = {}) {
  return contribution(n, {
    volunteer: { id: `vol${n}`, volunteerId: `VOL-2031-000${n}`, name: `Volunteer ${n}` },
    review: { reviewedAt: null, note: '', reviewedBy: null },
    ...overrides,
  })
}
