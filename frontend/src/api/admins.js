import { api } from './client'

export const adminsApi = {
  // Admin only. The new admin must change the temporary password on first login.
  create: ({ name, email, temporaryPassword }) =>
    api.post('/admins', { name, email, temporaryPassword }).then((r) => r.user),
}
