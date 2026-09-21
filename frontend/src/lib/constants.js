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
