import { Outlet } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'
import PublicNavbar from '../components/PublicNavbar'

// Chrome for the public website and the sign-in / register pages.
export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <PublicNavbar />
      <Outlet />
      <PublicFooter />
    </div>
  )
}
