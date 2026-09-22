import { api } from './client'

const enc = encodeURIComponent

// A volunteer's account of one attendance, and the admin's verdict on it. Only what
// each side is allowed to send is ever forwarded: the volunteer never sends status,
// approvedHours, revision or review data; approvedHours and the verdict are always
// the admin's, and a review always carries the revision it was loaded with so the
// server can refuse a stale one.
export const contributionsApi = {
  // -> { items, page, limit, total }. Volunteers get their own; admins get everyone's
  // and may filter by volunteer.
  list: ({ page, limit, activity, status, volunteer } = {}, options) =>
    api.get('/contributions', { ...options, query: { page, limit, activity, status, volunteer } }),

  get: (id, options) => api.get(`/contributions/${enc(id)}`, options).then((r) => r.contribution),

  // Volunteer only, tied to their own attendance. Starts PENDING.
  create: ({ attendance, description }) =>
    api.post('/contributions', { attendance, description }).then((r) => r.contribution),

  // Volunteer, owner, PENDING only.
  update: (id, { description }) =>
    api.patch(`/contributions/${enc(id)}`, { description }).then((r) => r.contribution),

  // Admin only. `approvedHours` is required to verify and must be omitted to reject;
  // `revision` must be the one last loaded, or the server answers a conflict instead
  // of applying the review.
  review: (id, { status, approvedHours, note, revision }) =>
    api.patch(`/contributions/${enc(id)}/review`, { status, approvedHours, note, revision }).then((r) => r.contribution),
}
