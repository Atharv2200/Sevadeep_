import { Link } from 'react-router-dom'
import { CalendarCheck2, CheckCircle2, ClipboardCheck, ClipboardList, Clock, ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react'
import { contributionsApi } from '../../api/contributions'
import { statsApi } from '../../api/stats'
import { Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime, formatHours } from '../../lib/format'

function Count({ icon: Icon, tone, value, label, caption }) {
  return (
    <Card className="!p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-gray-600">{label}</p>
          {caption && <p className="text-xs text-gray-500 mt-0.5">{caption}</p>}
        </div>
      </div>
    </Card>
  )
}

const PENDING_LIMIT = 5

// A platform-wide summary (GET /stats/admin, all derived from Attendance/
// Contribution/Activity/User) plus the pending contributions actually waiting
// on an admin, so the two network calls together answer "what does the system
// look like" and "what do I need to do next".
async function loadOverview(signal) {
  const [stats, pending] = await Promise.all([
    statsApi.admin({ signal }),
    contributionsApi.list({ status: 'PENDING', limit: PENDING_LIMIT }, { signal }),
  ])
  return { stats, pending: pending.items, pendingTotal: pending.total }
}

export default function Overview() {
  const { data, error, loading, reload } = useAsync(loadOverview, [])

  return (
    <>
      <PageHeader title="Admin Overview" description="A summary of Sevadeep's volunteers, activities and contributions" />

      {loading && !data && (
        <div className="py-12 flex justify-center text-primary-600">
          <Spinner className="w-8 h-8" label="Loading overview…" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Count
              icon={Users}
              tone="bg-primary-100 text-primary-600"
              value={data.stats.volunteers.total}
              label="Volunteers"
              caption={`${data.stats.volunteers.active} active · ${data.stats.volunteers.suspended} suspended`}
            />
            <Count
              icon={CalendarCheck2}
              tone="bg-blue-100 text-blue-600"
              value={data.stats.activities.total}
              label="Activities"
              caption={`${data.stats.activities.open} open`}
            />
            <Count
              icon={UserCheck}
              tone="bg-teal-100 text-teal-600"
              value={data.stats.attendance.total}
              label="Check-ins recorded"
            />
            <Count
              icon={ClipboardList}
              tone="bg-yellow-100 text-yellow-600"
              value={data.stats.contributions.pending}
              label="Pending review"
            />
            <Count
              icon={ClipboardCheck}
              tone="bg-green-100 text-green-600"
              value={data.stats.contributions.verified}
              label="Verified contributions"
            />
            <Count
              icon={Clock}
              tone="bg-purple-100 text-purple-600"
              value={formatHours(data.stats.contributions.verifiedHours)}
              label="Verified hours"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  Needs review
                </h2>
                {data.pendingTotal > 0 && (
                  <Link to="/admin/contributions?status=PENDING" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    View all
                  </Link>
                )}
              </div>
              {data.pending.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Nothing waiting on you" description="Submitted contributions needing review will show up here." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.pending.map((item) => (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div>
                        <Link to={`/admin/contributions/${item.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                          {item.volunteer.name ?? 'Unknown volunteer'}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {item.activity?.title ?? 'Activity unavailable'} · {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <Link to={`/admin/contributions/${item.id}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">
                        Review
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-6">
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
          </div>
        </>
      )}
    </>
  )
}
