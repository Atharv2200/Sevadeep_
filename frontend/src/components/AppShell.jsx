import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { KeyRound, LogOut } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../auth/AuthContext'

const navLinkClass = ({ isActive }) =>
  `px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
    isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-white hover:text-primary-600'
  }`

// Frame for the signed-in areas: header with the account, section navigation and
// the routed page. `navItems` is [{ to, label, end? }].
export default function AppShell({ area, navItems }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50">
      <header className="bg-white shadow-md">
        <div className="container-custom px-4 md:px-8 flex flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/" aria-label="Sevadeep website" className="flex items-center gap-3">
            <Logo className="w-10 h-10" showText textClassName="text-xl font-bold text-gray-800" />
            <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wide">{area}</span>
          </Link>

          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:block text-gray-600 mr-2">{user.name ?? user.email}</span>
            <Link to="/change-password" className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
              <KeyRound className="w-4 h-4" />
              Password
            </Link>
            <button onClick={signOut} className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>

        <nav aria-label={`${area} navigation`} className="border-t border-gray-100">
          <div className="container-custom px-4 md:px-8 flex gap-2 overflow-x-auto py-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="container-custom px-4 md:px-8 py-8 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}
