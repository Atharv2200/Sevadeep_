import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../auth/AuthContext'
import { homePathFor } from '../lib/constants'

const SECTION_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/#about' },
  { label: 'Activities', to: '/#activities' },
  { label: 'Gallery', to: '/#gallery' },
  { label: 'Contact', to: '/#contact' },
]

const DESKTOP_LINK = 'text-gray-700 hover:text-primary-600 transition-colors font-medium'
const MOBILE_LINK = 'text-left text-gray-700 hover:text-primary-600 transition-colors font-medium py-2'

// Sign in / dashboard / sign out, depending on who is signed in. Nothing is shown
// while the session is still being checked, so the buttons do not flash.
function AccountLinks({ mobile, onNavigate }) {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const linkClass = mobile ? `${MOBILE_LINK} flex items-center gap-2` : `${DESKTOP_LINK} flex items-center gap-2`

  const signOut = async () => {
    onNavigate()
    navigate('/')
    await logout()
  }

  if (status === 'loading') return null

  if (user) {
    return (
      <>
        <Link to={homePathFor(user)} onClick={onNavigate} className={linkClass}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
        <button onClick={signOut} className={linkClass}>
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </>
    )
  }

  return (
    <>
      <Link to="/login" onClick={onNavigate} className={linkClass}>
        <User className="w-4 h-4" />
        Sign in
      </Link>
      <Link to="/register" onClick={onNavigate} className={`btn-primary ${mobile ? 'w-full text-center' : ''}`}>
        Volunteer Now
      </Link>
    </>
  )
}

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <Link to="/" onClick={closeMenu} aria-label="Sevadeep home">
            <Logo className="w-10 h-10" showText textClassName="text-2xl font-bold text-gray-800" />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {SECTION_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className={DESKTOP_LINK}>
                {link.label}
              </Link>
            ))}
            <div className="h-6 w-px bg-gray-300"></div>
            <AccountLinks onNavigate={closeMenu} />
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-white border-t">
          <div className="container-custom py-4 flex flex-col gap-4">
            {SECTION_LINKS.map((link) => (
              <Link key={link.label} to={link.to} onClick={closeMenu} className={MOBILE_LINK}>
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-200 pt-2"></div>
            <AccountLinks mobile onNavigate={closeMenu} />
          </div>
        </motion.div>
      )}
    </nav>
  )
}
