import { api } from './client'

const enc = encodeURIComponent

export const donationsApi = {
  // Public summary statistics (total raised, total donations, etc.)
  getSummaryStats: (options) => api.get('/donations/stats/summary', options),

  // List donations (admin sees all with stats, volunteers see their own)
  list: ({ page, limit, status, activity, search } = {}, options) =>
    api.get('/donations', { ...options, query: { page, limit, status, activity, search } }),

  // Get single donation
  get: (id, options) => api.get(`/donations/${enc(id)}`, options),

  // Create donation (public, volunteer, or admin)
  create: (data) => api.post('/donations', data).then((r) => r.donation),

  // Update donation status (admin only)
  updateStatus: (id, { status }) => api.patch(`/donations/${enc(id)}/status`, { status }).then((r) => r.donation),

  // Allocate donation to activities (admin only)
  allocate: (id, { activityIds }) => api.patch(`/donations/${enc(id)}/allocate`, { activityIds }).then((r) => r.donation),

  // Get donation impact report data
  getImpact: (id, options) => api.get(`/donations/${enc(id)}/impact`, options),
}
