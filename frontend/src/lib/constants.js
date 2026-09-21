export const ROLES = {
  VOLUNTEER: 'VOLUNTEER',
  ADMIN: 'ADMIN',
}

// Where a signed-in user lands by default.
export function homePathFor(user) {
  if (user?.role === ROLES.ADMIN) return '/admin'
  if (user?.role === ROLES.VOLUNTEER) return '/volunteer'
  return '/'
}

// Activity categories, in the order they are offered. Values match the API.
export const ACTIVITY_CATEGORIES = [
  { value: 'CLOTHES', label: 'Clothes distribution' },
  { value: 'BOOKS', label: 'Books distribution' },
  { value: 'CLEANLINESS', label: 'Cleanliness drive' },
  { value: 'FOOD', label: 'Food distribution' },
  { value: 'HEALTH', label: 'Health camp' },
  { value: 'ELDERLY_CARE', label: 'Elderly care' },
  { value: 'OTHER', label: 'Other' },
]

export function categoryLabel(value) {
  return ACTIVITY_CATEGORIES.find((category) => category.value === value)?.label ?? value
}

export const ACTIVITY_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

// Limits mirrored from the API for form hints and maxLength. The server enforces them.
export const ACTIVITY_LIMITS = {
  title: 120,
  description: 5000,
  locationName: 120,
  address: 300,
  instructions: 2000,
}
