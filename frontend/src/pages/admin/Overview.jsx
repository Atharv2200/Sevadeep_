import { Link } from 'react-router-dom'
import { ShieldCheck, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { volunteersApi } from '../../api/volunteers'
import { Button, Card, ErrorState, PageHeader, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'

function Count({ icon: Icon, tone, value, label }) {
  return (
    <Card className="!p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-gray-600">{label}</p>
        </div>
      </div>
    </Card>
  )
}

// Counts come straight from the volunteers API (a page of size 1 still reports the
// total). Activity, attendance and contribution figures join in as those features do.
async function loadCounts(signal) {
  const [all, suspended] = await Promise.all([
    volunteersApi.list({ limit: 1 }, { signal }),
    volunteersApi.list({ limit: 1, status: 'SUSPENDED' }, { signal }),
  ])
  return { total: all.total, suspended: suspended.total, active: all.total - suspended.total }
}

export default function Overview() {
  const { data, error, loading, reload } = useAsync(loadCounts, [])

  return (
    <>
      <PageHeader title="Admin Overview" description="Volunteer management for Sevadeep" />

      {loading && !data && (
        <div className="py-12 flex justify-center text-primary-600">
          <Spinner className="w-8 h-8" label="Loading overview…" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Count icon={Users} tone="bg-primary-100 text-primary-600" value={data.total} label="Volunteers" />
          <Count icon={UserCheck} tone="bg-green-100 text-green-600" value={data.active} label="Active" />
          <Count icon={UserX} tone="bg-red-100 text-red-600" value={data.suspended} label="Suspended" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" aria-hidden="true" />
            Volunteers
          </h2>
          <p className="text-gray-600 mb-4">Browse, search and suspend or reactivate volunteer accounts.</p>
          <Button as={Link} to="/admin/volunteers">Manage volunteers</Button>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" aria-hidden="true" />
            Administrators
          </h2>
          <p className="text-gray-600 mb-4">Give a colleague admin access with a temporary password.</p>
          <Button as={Link} to="/admin/admins" variant="secondary">
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Add an admin
          </Button>
        </Card>
      </div>
    </>
  )
}
