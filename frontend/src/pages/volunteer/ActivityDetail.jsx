import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import { attendanceApi } from '../../api/attendance'
import { contributionsApi } from '../../api/contributions'
import ActivityFacts from '../../components/activity/ActivityFacts'
import CategoryIcon from '../../components/activity/CategoryIcon'
import ContributionPanel from '../../components/contribution/ContributionPanel'
import { Alert, Button, Card, ErrorState, PageHeader, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { categoryLabel } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'

// What the volunteer should know about the activity's current state.
function StateNotice({ activity }) {
  if (activity.status === 'CANCELLED') return <Alert tone="error" title="This activity has been cancelled">There is nothing to attend.</Alert>
  if (activity.status === 'CLOSED') return <Alert tone="info" title="This activity is closed">It is no longer taking part.</Alert>
  if (activity.attendance.isOpen) return <Alert tone="success" title="Attendance is open now" />
  if (new Date(activity.attendance.opensAt) > new Date()) {
    return <Alert tone="info" title="Attendance is not open yet">It opens on {formatDateTime(activity.attendance.opensAt)}.</Alert>
  }
  return <Alert tone="info" title="Attendance is closed">The attendance window ended on {formatDateTime(activity.attendance.closesAt)}.</Alert>
}

// Whether the volunteer has an attendance record here at all, and if so what they
// have (or have not) reported on it. Loads on its own so a problem here never hides
// the activity above it.
function ContributionSection({ activityId }) {
  const attendanceLoad = useAsync(
    (signal) => attendanceApi.list({ activity: activityId, limit: 1 }, { signal }).then((page) => page.items[0] ?? null),
    [activityId]
  )
  const contributionLoad = useAsync(
    (signal) => contributionsApi.list({ activity: activityId, limit: 1 }, { signal }).then((page) => page.items[0] ?? null),
    [activityId]
  )
  const [saved, setSaved] = useState(null)

  if (attendanceLoad.loading && !attendanceLoad.data) {
    return (
      <Card>
        <div className="py-6 flex justify-center text-primary-600">
          <Spinner className="w-6 h-6" label="Checking your attendance…" />
        </div>
      </Card>
    )
  }
  // Nothing to report on without an attendance record.
  if (!attendanceLoad.data && !attendanceLoad.error) return null

  return (
    <Card>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Your contribution</h2>
      {attendanceLoad.error || contributionLoad.error ? (
        <ErrorState error={attendanceLoad.error ?? contributionLoad.error} onRetry={() => { attendanceLoad.reload(); contributionLoad.reload() }} />
      ) : contributionLoad.loading && !contributionLoad.data && !saved ? (
        <div className="py-6 flex justify-center text-primary-600">
          <Spinner className="w-6 h-6" label="Loading your contribution…" />
        </div>
      ) : (
        <ContributionPanel
          attendanceId={attendanceLoad.data.id}
          contribution={saved ?? contributionLoad.data}
          onChange={setSaved}
          onConflict={() => { setSaved(null); contributionLoad.reload() }}
        />
      )}
    </Card>
  )
}

export default function ActivityDetail() {
  const { id } = useParams()
  const { data: activity, error, loading, reload } = useAsync((signal) => activitiesApi.get(id, { signal }), [id])

  const back = (
    <Button as={Link} to="/volunteer/activities" variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      All activities
    </Button>
  )

  if (loading && !activity) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading activity…" />
      </div>
    )
  }
  if (error) {
    return (
      <>
        <PageHeader title="Activity" actions={back} />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    )
  }

  return (
    <>
      <PageHeader title={activity.title} description={categoryLabel(activity.category)} actions={back} />

      <div className="space-y-6">
        <StateNotice activity={activity} />

        <Card>
          <div className="flex items-center gap-4 mb-6">
            <CategoryIcon category={activity.category} />
            <h2 className="text-xl font-bold text-gray-900 flex-grow">Details</h2>
            <StatusBadge status={activity.status} />
          </div>
          <ActivityFacts activity={activity} />
        </Card>

        {activity.status !== 'CANCELLED' && (
          <Card className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your attendance</h2>
              <p className="text-gray-600 text-sm">Check in by scanning the QR code at the venue. Already there? Check in or out from here.</p>
            </div>
            <Button as={Link} to={`/attend/${activity.id}`} variant="secondary">Open attendance</Button>
          </Card>
        )}

        <ContributionSection activityId={activity.id} />

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-3">About this activity</h2>
          <p className="text-gray-700 whitespace-pre-line break-words">{activity.description}</p>
          {activity.instructions && (
            <>
              <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">Instructions</h3>
              <p className="text-gray-700 whitespace-pre-line break-words">{activity.instructions}</p>
            </>
          )}
        </Card>
      </div>
    </>
  )
}
