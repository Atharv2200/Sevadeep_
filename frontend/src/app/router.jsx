import { Route, Routes } from 'react-router-dom'
import RequireAuth from '../auth/RequireAuth'
import RequireRole from '../auth/RequireRole'
import { ROLES } from '../lib/constants'
import AdminLayout from '../layouts/AdminLayout'
import VolunteerLayout from '../layouts/VolunteerLayout'
import AdminActivities from '../pages/admin/Activities'
import AdminActivityDetail from '../pages/admin/ActivityDetail'
import AdminActivityForm from '../pages/admin/ActivityForm'
import AdminAdmins from '../pages/admin/Admins'
import AdminOverview from '../pages/admin/Overview'
import AdminVolunteerDetail from '../pages/admin/VolunteerDetail'
import AdminVolunteers from '../pages/admin/Volunteers'
import VolunteerActivities from '../pages/volunteer/Activities'
import VolunteerActivityDetail from '../pages/volunteer/ActivityDetail'
import VolunteerDashboard from '../pages/volunteer/Dashboard'
import VolunteerProfile from '../pages/volunteer/Profile'
import PublicLayout from '../layouts/PublicLayout'
import ChangePassword from '../pages/account/ChangePassword'
import NotFound from '../pages/NotFound'
import Home from '../pages/public/Home'
import Login from '../pages/public/Login'
import Register from '../pages/public/Register'

// The route table. Guards only decide what to render; the API enforces access.
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="change-password" element={<ChangePassword />} />

        <Route element={<RequireRole role={ROLES.VOLUNTEER} />}>
          <Route path="volunteer" element={<VolunteerLayout />}>
            <Route index element={<VolunteerDashboard />} />
            <Route path="activities" element={<VolunteerActivities />} />
            <Route path="activities/:id" element={<VolunteerActivityDetail />} />
            <Route path="profile" element={<VolunteerProfile />} />
            <Route path="*" element={<NotFound compact />} />
          </Route>
        </Route>

        <Route element={<RequireRole role={ROLES.ADMIN} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="activities" element={<AdminActivities />} />
            <Route path="activities/new" element={<AdminActivityForm />} />
            <Route path="activities/:id" element={<AdminActivityDetail />} />
            <Route path="activities/:id/edit" element={<AdminActivityForm />} />
            <Route path="volunteers" element={<AdminVolunteers />} />
            <Route path="volunteers/:id" element={<AdminVolunteerDetail />} />
            <Route path="admins" element={<AdminAdmins />} />
            <Route path="*" element={<NotFound compact />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
