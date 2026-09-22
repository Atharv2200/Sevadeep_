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

// Activities that can still be edited. Mirrors the API, which enforces it; used to
// hide the Edit action on closed and cancelled activities.
export const EDITABLE_ACTIVITY_STATUSES = ['DRAFT', 'OPEN']

export const CONTRIBUTION_STATUSES = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

// Limits and steps mirrored from the API for form hints and input attributes.
// The server is the one that enforces them.
export const CONTRIBUTION_LIMITS = { description: 5000, reviewNote: 2000 }
export const APPROVED_HOURS_STEP = 0.25
export const MAX_APPROVED_HOURS = 24

// Mirrored from the API for client-side hints only; the server is the one that
// enforces them.
export const CONTRIBUTION_PHOTO_LIMITS = {
  maxCount: 5,
  maxBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
}
