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
