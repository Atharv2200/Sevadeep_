import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Alert, Button, FullPageSpinner } from '../components/ui'
import { useAuth } from './AuthContext'

const CHANGE_PASSWORD_PATH = '/change-password'

// Route guard for signed-in areas. This is UX only: it decides what to show, while
// the backend independently rejects every unauthenticated or unauthorised request.
//   loading         -> spinner while the session is checked
//   anonymous       -> sign-in page, remembering where the user was going (?next=)
//   error           -> retry screen (the server is unreachable; not "signed out")
//   password change -> forced to /change-password until it is done
export default function RequireAuth() {
  const { status, user, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner label="Checking your session…" />

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert tone="error" title="We couldn't check your session">
            {error?.message}
          </Alert>
          <Button onClick={retry}>Try again</Button>
        </div>
      </div>
    )
  }

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  return <Outlet />
}
