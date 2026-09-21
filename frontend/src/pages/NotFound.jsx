import { Link } from 'react-router-dom'
import { Button, Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { homePathFor } from '../lib/constants'

// `compact` renders inside an app layout; the default fills a public page.
export default function NotFound({ compact = false }) {
  const { user } = useAuth()

  if (compact) {
    return (
      <Card>
        <EmptyState
          title="Page not found"
          description="This page does not exist or has moved."
          action={<Button as={Link} to={homePathFor(user)}>Back to my dashboard</Button>}
        />
      </Card>
    )
  }

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
