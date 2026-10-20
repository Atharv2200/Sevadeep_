import { api } from './client'

const enc = encodeURIComponent

export const donationsApi = {
  // List donations
  list: ({ page, limit, status, activity } = {}, options) =>
    api.get('/donations', { ...options, query: { page, limit, status, activity } }),

  // Get single donation
  get: (id, options) => api.get(`/donations/${enc(id)}`, options),

  // Create donation
  create: (data) => api.post('/donations', data).then((r) => r.donation),

  // Update donation status
  updateStatus: (id, { status }) => api.patch(`/donations/${enc(id)}/status`, { status }).then((r) => r.donation),

  // Allocate donation to activities
  allocate: (id, { activityIds }) => api.patch(`/donations/${enc(id)}/allocate`, { activityIds }).then((r) => r.donation),

  // Get donation impact report
  getImpact: (id, options) => api.get(`/donations/${enc(id)}/impact`, options),
}
