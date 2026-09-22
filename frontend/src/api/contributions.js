import { api } from './client'

const enc = encodeURIComponent

function photoFormData({ attendance, description, photos } = {}) {
  const form = new FormData()
  if (attendance !== undefined) form.append('attendance', attendance)
  if (description !== undefined) form.append('description', description)
  for (const photo of photos ?? []) form.append('photos', photo)
  return form
}

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

  // Volunteer only, tied to their own attendance. Starts PENDING. `photos` is
  // optional; when given, the request goes as multipart instead of plain JSON.
  create: ({ attendance, description, photos }) =>
    (photos && photos.length > 0
      ? api.postForm('/contributions', photoFormData({ attendance, description, photos }))
      : api.post('/contributions', { attendance, description })
    ).then((r) => r.contribution),

  // Volunteer, owner, PENDING only.
  update: (id, { description }) =>
    api.patch(`/contributions/${enc(id)}`, { description }).then((r) => r.contribution),

  // Volunteer, owner, PENDING only. At least one photo is required.
  addPhotos: (id, photos) => api.postForm(`/contributions/${enc(id)}/photos`, photoFormData({ photos })).then((r) => r.contribution),

  // Volunteer, owner, PENDING only.
  removePhoto: (id, photoId) => api.delete(`/contributions/${enc(id)}/photos/${enc(photoId)}`).then((r) => r.contribution),

  // Same-origin and cookie-authenticated, so an <img> can point straight at it.
  photoUrl: (id, photoId) => `/api/contributions/${enc(id)}/photos/${enc(photoId)}`,

  // Admin only. `approvedHours` is required to verify and must be omitted to reject;
  // `revision` must be the one last loaded, or the server answers a conflict instead
  // of applying the review.
  review: (id, { status, approvedHours, note, revision }) =>
    api.patch(`/contributions/${enc(id)}/review`, { status, approvedHours, note, revision }).then((r) => r.contribution),
}
