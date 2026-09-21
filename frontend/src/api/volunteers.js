import { api } from './client'

export const volunteersApi = {
  // Volunteer: own profile plus derived stats -> { volunteer, stats }
  getMe: (options) => api.get('/volunteers/me', options),
  // Only name and phone are editable -> volunteer
  updateMe: ({ name, phone }) => api.patch('/volunteers/me', { name, phone }).then((r) => r.volunteer),

  // Admin
  list: ({ page, limit, search, status } = {}, options) =>
    api.get('/volunteers', { ...options, query: { page, limit, search, status } }),
  get: (id, options) => api.get(`/volunteers/${encodeURIComponent(id)}`, options),
  setStatus: (id, status) =>
    api.patch(`/volunteers/${encodeURIComponent(id)}/status`, { status }).then((r) => r.volunteer),
}
