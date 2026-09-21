import { api } from './client'

// Each function resolves to the user object the backend returns.
export const authApi = {
  me: (options) => api.get('/auth/me', options).then((r) => r.user),
  login: ({ email, password }) => api.post('/auth/login', { email, password }).then((r) => r.user),
  register: ({ name, email, phone, password }) =>
    api.post('/auth/register', { name, email, phone, password }).then((r) => r.user),
  logout: () => api.post('/auth/logout'),
  changePassword: ({ currentPassword, newPassword }) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.user),
}
