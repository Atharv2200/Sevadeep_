import { api } from './client'

export const statsApi = {
  // Admin only: platform-wide counts derived from the same Attendance/Contribution/
  // Activity/User records as everywhere else -> { volunteers, activities, attendance, contributions }
  admin: (options) => api.get('/stats/admin', options),
}
