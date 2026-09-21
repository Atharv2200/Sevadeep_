import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import ActivityFacts from '../../components/activity/ActivityFacts'
import CategoryIcon from '../../components/activity/CategoryIcon'
import { Alert, Button, Card, ErrorState, PageHeader, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { EDITABLE_ACTIVITY_STATUSES, categoryLabel } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'

// How each status change is offered. The server says which are allowed right now
// (`allowedTransitions`); this only supplies the wording. Closing and cancelling are
// final, so they ask for confirmation.
const ACTIONS = {
  OPEN: { label: 'Open for volunteers', variant: 'primary', confirm: null },
  CLOSED: { label: 'Close activity', variant: 'secondary', confirm: 'Close this activity? It ends attendance now and cannot be reopened.' },
  CANCELLED: { label: 'Cancel activity', variant: 'danger', confirm: 'Cancel this activity? This cannot be undone.' },
}

const STATUS_HELP = {
  DRAFT: 'Only admins can see this activity. Open it when it is ready for volunteers.',
  OPEN: 'Volunteers can see this activity. Attendance is possible during its attendance window.',
  CLOSED: 'This activity is closed. It cannot be reopened.',
  CANCELLED: 'This activity was cancelled. Volunteers no longer see it in their list.',
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 break-words">{children}</dd>
    </div>
  )
}

export default function ActivityDetail() {
  const { id } = useParams()
  const { data: activity, error, loading, reload } = useAsync((signal) => activitiesApi.get(id, { signal }), [id])

  const [confirming, setConfirming] = useState(null)
  const [changing, setChanging] = useState(false)
  const [actionError, setActionError] = useState(null)

  const changeStatus = async (status) => {
    setChanging(true)
    setActionError(null)
    try {
      await activitiesApi.setStatus(id, status)
      setConfirming(null)
      reload()
    } catch (err) {
      setActionError(err)
      // The status may have changed elsewhere; show the current state and allowed actions.
      if (err.status === 409) reload()
    } finally {
      setChanging(false)
    }
  }

  const back = (
    <Button as={Link} to="/admin/activities" variant="secondary" size="sm">
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

  const editable = EDITABLE_ACTIVITY_STATUSES.includes(activity.status)

  return (
    <>
      <PageHeader
        title={activity.title}
        description={categoryLabel(activity.category)}
        actions={
          <>
            {back}
            {editable && (
              <Button as={Link} to={`/admin/activities/${activity.id}/edit`} size="sm">
                <Pencil className="w-4 h-4" aria-hidden="true" />
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <CategoryIcon category={activity.category} />
              <h2 className="text-xl font-bold text-gray-900 flex-grow">Details</h2>
              <StatusBadge status={activity.status} />
            </div>
            <ActivityFacts activity={activity} />
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-line break-words">{activity.description}</p>
            {activity.instructions && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">Instructions</h3>
                <p className="text-gray-700 whitespace-pre-line break-words">{activity.instructions}</p>
              </>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>
            <dl className="grid sm:grid-cols-2 gap-6">
              <Field label="Coordinates">{activity.latitude}, {activity.longitude}</Field>
              <Field label="Check-in radius">{activity.radiusMeters} m</Field>
              <Field label="Attendance opens">{activity.attendanceOpensMinutesBefore} min before the start</Field>
              <Field label="Attendance closes">{activity.attendanceClosesMinutesAfter} min after the end</Field>
              <Field label="Created by">{activity.createdBy.name ?? 'Unknown'}</Field>
              <Field label="Created">{formatDateTime(activity.createdAt)}</Field>
            </dl>
          </Card>
        </div>

        <Card className="self-start">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">Status</h2>
            <StatusBadge status={activity.status} />
          </div>
          <p className="text-sm text-gray-600 mb-4">{STATUS_HELP[activity.status]}</p>
          {actionError && <Alert tone="error" className="mb-4">{actionError.message}</Alert>}

          {activity.allowedTransitions.length > 0 && (
            <div className="space-y-3">
              {confirming ? (
                <>
                  <p className="text-sm font-medium text-gray-900">{ACTIONS[confirming].confirm}</p>
                  <div className="flex gap-2">
                    <Button variant={ACTIONS[confirming].variant === 'secondary' ? 'primary' : ACTIONS[confirming].variant} loading={changing} onClick={() => changeStatus(confirming)}>
                      Yes, {ACTIONS[confirming].label.toLowerCase()}
                    </Button>
                    <Button variant="ghost" disabled={changing} onClick={() => setConfirming(null)}>Keep as is</Button>
                  </div>
                </>
              ) : (
                activity.allowedTransitions.map((status) => (
                  <Button
                    key={status}
                    variant={ACTIONS[status].variant}
                    className="w-full"
                    loading={changing && !ACTIONS[status].confirm}
                    onClick={() => (ACTIONS[status].confirm ? setConfirming(status) : changeStatus(status))}
                  >
                    {ACTIONS[status].label}
                  </Button>
                ))
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
