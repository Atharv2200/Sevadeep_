import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import Logo from '../components/Logo'
import { Button } from '../components/ui'
import { useAuth } from './AuthContext'
import { homePathFor } from '../lib/constants'

export default function AccessDenied() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-orange-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <Logo className="w-14 h-14 mx-auto mb-4" />
        <ShieldAlert className="w-10 h-10 text-primary-600 mx-auto mb-3" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You don&apos;t have access to this page</h1>
        <p className="text-gray-600 mb-6">This area is for a different kind of account than the one you are signed in with.</p>
        <Button as={Link} to={homePathFor(user)}>
          Go to my dashboard
        </Button>
      </div>
    </div>
  )
}
