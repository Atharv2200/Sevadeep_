import { useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, LogIn, LogOut, MapPin, QrCode, Camera } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import { attendanceApi } from '../../api/attendance'
import ActivityFacts from '../../components/activity/ActivityFacts'
import { Alert, Button, Card, ErrorState, PageHeader, Spinner, TextField } from '../../components/ui'
import PhotoUpload from '../../components/ui/PhotoUpload'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime } from '../../lib/format'
import { LocationError, getPosition } from '../../lib/geolocation'

// Failures that trying again cannot fix (a new QR scan, or the activity itself, is needed).
const FINAL_CODES = new Set([
  'INVALID_QR',
  'QR_EXPIRED',
  'ACTIVITY_CLOSED',
  'ACTIVITY_CANCELLED',
  'ATTENDANCE_WINDOW_CLOSED',
  'ALREADY_CHECKED_OUT',
  'NOT_CHECKED_IN',
  'ALREADY_COMPLETED',
  'NOT_FOUND',
  'FORBIDDEN',
])

const PROGRESS = {
  locating: 'Finding your location…',
  submitting: 'Recording your attendance…',
}

// Where the attendance QR lands. With a token (?t=) a volunteer who has not yet
// checked in can check in; once checked in they can check out (no QR needed). This page
// only collects a browser position and forwards it: every decision (window, token,
// accuracy, distance, duplicates) is made by the server, and its message is shown as is.
export default function Attend() {
  const { activityId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t') ?? ''

  const activityLoad = useAsync((signal) => activitiesApi.get(activityId, { signal }), [activityId])
  const mineLoad = useAsync(
    (signal) => attendanceApi.list({ activity: activityId, limit: 1 }, { signal }).then((page) => page.items[0] ?? null),
    [activityId]
  )

  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const [saved, setSaved] = useState(null)
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState([])
  // Set synchronously so a fast double tap cannot start two requests before the
  // button has re-rendered as disabled. The server (unique index) remains the real guard.
  const busy = useRef(false)

  const back = (
    <Button as={Link} to={`/volunteer/activities/${activityId}`} variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Activity details
    </Button>
  )

  const activity = activityLoad.data
  const loadError = activityLoad.error ?? mineLoad.error
  if (loadError) {
    return (
      <>
        <PageHeader title="Attendance" actions={back} />
        <ErrorState
          error={loadError}
          onRetry={loadError.status === 404 ? undefined : () => { activityLoad.reload(); mineLoad.reload() }}
        />
      </>
    )
  }
  if (!activity || (mineLoad.loading && !mineLoad.data && !saved)) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading attendance…" />
      </div>
    )
  }

  const attendance = saved ?? mineLoad.data
  const checkedIn = Boolean(attendance)
  const checkedOut = Boolean(attendance?.checkedOutAt)
  const busyNow = phase !== 'idle'

  const run = async (kind) => {
    if (busy.current) return
    busy.current = true
    setError(null)
    setDone(null)
    setPhase('locating')
    try {
      const position = await getPosition()
      setPhase('submitting')

      if (kind === 'complete') {
        // Submit completion with documentation
        const formData = new FormData()
        formData.append('token', token)
        formData.append('description', description)
        formData.append('latitude', position.latitude)
        formData.append('longitude', position.longitude)
        formData.append('accuracy', position.accuracy)

        photos.forEach((photo) => {
          formData.append('photos', photo)
        })

        const result = await attendanceApi.complete(activityId, formData)
        setSaved(result)
        setDone(kind)
      } else {
        const result =
          kind === 'in'
            ? await attendanceApi.checkIn(activityId, { token, ...position })
            : await attendanceApi.checkOut(activityId, position)
        setSaved(result)
        setDone(kind)
      }
    } catch (err) {
      setError(err)
      // Someone (or another tab) already recorded it: show what the server has.
      if (err.code === 'ALREADY_CHECKED_IN' || err.code === 'ALREADY_CHECKED_OUT' || err.code === 'ALREADY_COMPLETED') {
        setSaved(null)
        mineLoad.reload()
      }
    } finally {
      busy.current = false
      setPhase('idle')
    }
  }

  const retryable = error && !FINAL_CODES.has(error.code)
  const activityOver = activity.status === 'CLOSED' || activity.status === 'CANCELLED'

  return (
    <>
      <PageHeader title="Attendance" description={activity.title} actions={back} />

      <div className="space-y-6 max-w-3xl">
        {done === 'in' && <Alert tone="success" title="You're checked in">Thank you for volunteering.</Alert>}
        {done === 'out' && <Alert tone="success" title="You're checked out">Thank you for your time today.</Alert>}
        {done === 'complete' && <Alert tone="success" title="Activity completed!">You've earned {activity.creditHours} hours. Thank you for your contribution!</Alert>}

        {error && (
          <Alert tone="error" title={error instanceof LocationError ? "We couldn't get your location" : 'Attendance was not recorded'}>
            {error.message}
            {error.code === 'INVALID_QR' || error.code === 'QR_EXPIRED' ? ' Use your phone camera on the QR code shown at the venue.' : ''}
          </Alert>
        )}

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6">{activity.title}</h2>
          <ActivityFacts activity={activity} />
        </Card>

        <Card>
          {checkedOut ? (
            <div className="flex gap-4 items-start">
              <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Attendance complete</h2>
                <p className="text-gray-700 mt-1">Checked in {formatDateTime(attendance.checkedInAt)}</p>
                <p className="text-gray-700">Checked out {formatDateTime(attendance.checkedOutAt)}</p>
                {attendance.durationMinutes != null && <p className="text-gray-500 text-sm mt-1">{attendance.durationMinutes} minutes</p>}
              </div>
            </div>
          ) : checkedIn ? (
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">You're checked in</h2>
                  <p className="text-gray-700 mt-1">Since {formatDateTime(attendance.checkedInAt)}</p>
                </div>
              </div>
              {activity.status === 'CANCELLED' ? (
                <Alert tone="info">This activity has been cancelled.</Alert>
              ) : (
                <>
                  <p className="text-sm text-gray-600">When you are done, check out. We will ask for your location again; no QR code is needed.</p>
                  <Button onClick={() => run('out')} loading={busyNow} disabled={busyNow}>
                    {!busyNow && <LogOut className="w-4 h-4" aria-hidden="true" />}
                    Check out
                  </Button>
                </>
              )}
            </div>
          ) : activityOver ? (
            <Alert tone={activity.status === 'CANCELLED' ? 'error' : 'info'} title={activity.status === 'CANCELLED' ? 'This activity has been cancelled' : 'This activity is closed'}>
              Attendance can no longer be recorded.
            </Alert>
          ) : token ? (
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <Camera className="w-8 h-8 text-primary-600 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Complete activity</h2>
                  <p className="text-gray-600 mt-1">
                    After completing the activity, submit photos and a description as documentation. You'll earn {activity.creditHours} hours.
                  </p>
                </div>
              </div>
              {!activity.attendance.isOpen && (
                <Alert tone="info">
                  Attendance is not open right now. It runs from {formatDateTime(activity.attendance.opensAt)} to {formatDateTime(activity.attendance.closesAt)}.
                </Alert>
              )}
              <div className="space-y-4">
                <TextField
                  label="Describe your work"
                  multiline
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  hint="What did you do? What impact did you make?"
                  required
                />
                <PhotoUpload
                  value={photos}
                  onChange={setPhotos}
                  maxPhotos={5}
                  required
                />
                <Button
                  onClick={() => run('complete')}
                  loading={busyNow}
                  disabled={busyNow || (Boolean(error) && !retryable) || photos.length === 0 || description.trim().length < 10}
                >
                  {!busyNow && <Camera className="w-4 h-4" aria-hidden="true" />}
                  {error && retryable ? 'Try again' : 'Submit completion'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 items-start">
              <QrCode className="w-8 h-8 text-primary-600 flex-shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Scan the QR code to check in</h2>
                <p className="text-gray-600 mt-1">
                  At the venue, point your phone's camera at the QR code shown by the organisers and open the link it shows.
                </p>
              </div>
            </div>
          )}

          {busyNow && (
            <p role="status" className="mt-4 text-sm text-primary-700 flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              {PROGRESS[phase]}
            </p>
          )}
        </Card>
      </div>
    </>
  )
}
