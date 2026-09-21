import { api } from './client'

export const activitiesApi = {
  // Volunteers get OPEN activities that have not ended; admins get every status.
  // -> { items, page, limit, total }
  list: ({ page, limit, status, category, search } = {}, options) =>
    api.get('/activities', { ...options, query: { page, limit, status, category, search } }),

  // -> activity (volunteer or admin view, including the server-computed attendance window)
  get: (id, options) => api.get(`/activities/${encodeURIComponent(id)}`, options).then((r) => r.activity),

  // Admin only. The server sets the status (DRAFT) and the creator.
  create: (input) => api.post('/activities', input).then((r) => r.activity),
  // Admin only, content fields only. DRAFT and OPEN activities can be edited.
  update: (id, changes) => api.patch(`/activities/${encodeURIComponent(id)}`, changes).then((r) => r.activity),
  // Admin only. Moves along the server's transition table.
  setStatus: (id, status) => api.patch(`/activities/${encodeURIComponent(id)}/status`, { status }).then((r) => r.activity),
}
