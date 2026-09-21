import { api } from './client'

const enc = encodeURIComponent

// Only a position the browser reports and, for check-in, the token from the QR link are
// sent. Time, distance and identity are the server's business. Fields are listed one
// by one so nothing else can be sent by accident.
export const attendanceApi = {
  // Volunteer -> the recorded attendance. Rejected attempts are not stored.
  checkIn: (activityId, { token, latitude, longitude, accuracy }) =>
    api.post(`/activities/${enc(activityId)}/attendance`, { token, latitude, longitude, accuracy }).then((r) => r.attendance),

  // Volunteer, no QR needed -> the updated attendance.
  checkOut: (activityId, { latitude, longitude, accuracy }) =>
    api.post(`/activities/${enc(activityId)}/attendance/check-out`, { latitude, longitude, accuracy }).then((r) => r.attendance),

  // Admin: everyone who has checked in to an activity -> { items, total } (at most 200).
  live: (activityId, options) => api.get(`/activities/${enc(activityId)}/attendance`, options),

  // History -> { items, page, limit, total }. Volunteers get their own records; admins
  // get everyone's and may filter by volunteer. `activity` narrows either.
  list: ({ page, limit, activity, volunteer } = {}, options) =>
    api.get('/attendance', { ...options, query: { page, limit, activity, volunteer } }),
}
