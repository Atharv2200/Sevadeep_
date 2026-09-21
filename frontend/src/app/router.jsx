import { Route, Routes } from 'react-router-dom'
import RequireAuth from '../auth/RequireAuth'
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
      </Route>
    </Routes>
  )
}
