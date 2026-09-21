import { Outlet } from 'react-router-dom'
import AccessDenied from './AccessDenied'
import { useAuth } from './AuthContext'

// Nest inside <RequireAuth/>. Shows an access-denied page to signed-in users with
// the wrong role. UX only: the API enforces roles on every request regardless.
export default function RequireRole({ role }) {
  const { user } = useAuth()
  const allowed = Array.isArray(role) ? role : [role]
  return user && allowed.includes(user.role) ? <Outlet /> : <AccessDenied />
}
