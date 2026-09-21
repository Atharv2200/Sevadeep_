import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export default function NotFound() {
  return (
    <section className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-orange-50">
      <div className="text-center px-4">
        <p className="text-6xl font-bold text-primary-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">The page you are looking for does not exist or has moved.</p>
        <Button as={Link} to="/">
          Back to home
        </Button>
      </div>
    </section>
  )
}
