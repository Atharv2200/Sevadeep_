import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Award, Calendar, Clock } from 'lucide-react'
import { volunteersApi } from '../../api/volunteers'
import { Alert, Button, Card, ErrorState, PageHeader, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatDateTime, formatHours } from '../../lib/format'

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 break-words">{children}</dd>
    </div>
  )
}

export default function VolunteerDetail() {
  const { id } = useParams()
  const { data, error, loading, reload } = useAsync((signal) => volunteersApi.get(id, { signal }), [id])

  const [confirming, setConfirming] = useState(false)
  const [changing, setChanging] = useState(false)
  const [actionError, setActionError] = useState(null)

  const changeStatus = async (status) => {
    setChanging(true)
    setActionError(null)
    try {
      await volunteersApi.setStatus(id, status)
      setConfirming(false)
      reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setChanging(false)
    }
  }

  const back = (
    <Button as={Link} to="/admin/volunteers" variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      All volunteers
    </Button>
  )

  if (loading && !data) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading volunteer…" />
      </div>
    )
  }
  if (error) {
    return (
      <>
        <PageHeader title="Volunteer" actions={back} />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    )
  }

  const { volunteer, stats } = data
  const suspended = volunteer.status === 'SUSPENDED'

  return (
    <>
      <PageHeader title={volunteer.name} description={`Volunteer ID: ${volunteer.volunteerId}`} actions={back} />

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Profile</h2>
            <StatusBadge status={volunteer.status} />
          </div>
          <dl className="grid sm:grid-cols-2 gap-6">
            <Field label="Email">{volunteer.email}</Field>
            <Field label="Phone">{volunteer.phone}</Field>
            <Field label="Joined">{formatDate(volunteer.joinedAt)}</Field>
            <Field label="Last sign-in">{formatDateTime(volunteer.lastLoginAt)}</Field>
          </dl>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account access</h2>
          <p className="text-sm text-gray-600 mb-4">
            {suspended
              ? 'This volunteer cannot sign in or take part until reactivated.'
              : 'Suspending stops this volunteer signing in or taking part. Their history is kept.'}
          </p>
          {actionError && <Alert tone="error" className="mb-4">{actionError.message}</Alert>}

          {suspended ? (
            <Button loading={changing} onClick={() => changeStatus('ACTIVE')}>Reactivate volunteer</Button>
          ) : confirming ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900">Suspend {volunteer.name}?</p>
              <div className="flex gap-2">
                <Button variant="danger" loading={changing} onClick={() => changeStatus('SUSPENDED')}>Confirm suspension</Button>
                <Button variant="ghost" disabled={changing} onClick={() => setConfirming(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>Suspend volunteer</Button>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: Clock, tone: 'bg-primary-100 text-primary-600', value: formatHours(stats.verifiedHours), label: 'Verified hours' },
          { icon: Calendar, tone: 'bg-green-100 text-green-600', value: stats.activitiesAttended, label: 'Activities attended' },
          { icon: Award, tone: 'bg-yellow-100 text-yellow-600', value: stats.verifiedActivities, label: 'Verified contributions' },
        ].map(({ icon: Icon, tone, value, label }) => (
          <Card key={label} className="!p-6">
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
        ))}
      </div>
    </>
  )
}
