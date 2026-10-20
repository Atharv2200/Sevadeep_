import { api } from './client'

export const aiApi = {
  // Generate activity description
  generateDescription: (data) => api.post('/ai/generate-description', data).then((r) => r.description),

  // Generate donor impact report
  generateImpactReport: (data) => api.post('/ai/generate-impact-report', data).then((r) => r.report),

  // Generate social media caption
  generateCaption: (data) => api.post('/ai/generate-caption', data).then((r) => r.caption),

  // Check AI service status
  checkStatus: () => api.get('/ai/status').then((r) => r.available),
}
