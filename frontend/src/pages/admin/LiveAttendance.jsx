import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, UserCheck } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import { attendanceApi } from '../../api/attendance'
import AttendanceTable from '../../components/activity/AttendanceTable'
import QrPanel from '../../components/activity/QrPanel'
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, StatusBadge } from '../../components/ui'
import { usePolling } from '../../hooks/usePolling'
import { formatDateTime } from '../../lib/format'

// How often the list refreshes. Plain polling: no WebSockets in v1.
export const LIVE_POLL_MS = 10000

// The admin's attendance screen for one activity: the QR to show volunteers, and who
// has checked in so far. Everything shown is what the server recorded.
export default function LiveAttendance() {
  const { id } = useParams()
  const { data, error, loading, updatedAt, reload } = usePolling(
    async (signal) => {
      const [activity, live] = await Promise.all([activitiesApi.get(id, { signal }), attendanceApi.live(id, { signal })])
      return { activity, ...live }
    },
    { intervalMs: LIVE_POLL_MS, deps: [id] }
  )

  const back = (
    <Button as={Link} to={`/admin/activities/${id}`} variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Activity details
    </Button>
  )

  if (loading && !data) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading attendance…" />
      </div>
    )
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Attendance" actions={back} />
        <ErrorState error={error} onRetry={error?.status === 404 ? undefined : reload} />
      </>
    )
  }

  const { activity, items, total } = data
  return (
    <>
      <PageHeader
        title="Attendance"
        description={activity.title}
        actions={
          <>
            <StatusBadge status={activity.status} />
            {back}
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <QrPanel activityId={id} activity={activity} />

        <div className="lg:col-span-2 space-y-4">
          {error && (
            <Alert tone="error" title="Couldn't refresh the list">
              Showing what we had at {formatDateTime(updatedAt)}. We keep trying.
            </Alert>
          )}

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Checked in ({total})</h2>
              <p className="text-xs text-gray-500">Updates every {LIVE_POLL_MS / 1000} seconds</p>
            </div>

            {items.length === 0 ? (
              <EmptyState icon={UserCheck} title="No one has checked in yet" description="Volunteers appear here as soon as they check in." />
            ) : (
              <>
                <AttendanceTable items={items} mode="activity" />
                {total > items.length && (
                  <p className="p-4 text-sm text-gray-600 border-t border-gray-100">Showing the latest {items.length} of {total}.</p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
