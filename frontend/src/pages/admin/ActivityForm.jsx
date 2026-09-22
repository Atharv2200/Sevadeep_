import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LocateFixed } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import { Alert, Button, Card, ErrorState, PageHeader, Select, Spinner, TextField } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { ACTIVITY_CATEGORIES, ACTIVITY_LIMITS, EDITABLE_ACTIVITY_STATUSES } from '../../lib/constants'
import { fromLocalInput, toLocalInput } from '../../lib/format'
import { getPosition } from '../../lib/geolocation'

const EMPTY_FORM = {
  title: '',
  category: '',
  description: '',
  startsAt: '',
  endsAt: '',
  locationName: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: '100',
  instructions: '',
  attendanceOpensMinutesBefore: '30',
  attendanceClosesMinutesAfter: '30',
}

const REQUIRED = ['title', 'category', 'description', 'startsAt', 'endsAt', 'locationName', 'latitude', 'longitude', 'radiusMeters']
const NUMERIC = ['latitude', 'longitude', 'radiusMeters', 'attendanceOpensMinutesBefore', 'attendanceClosesMinutesAfter']
const DATES = ['startsAt', 'endsAt']

function toForm(activity) {
  return {
    title: activity.title,
    category: activity.category,
    description: activity.description,
    startsAt: toLocalInput(activity.startsAt),
    endsAt: toLocalInput(activity.endsAt),
    locationName: activity.locationName,
    address: activity.address ?? '',
    latitude: String(activity.latitude),
    longitude: String(activity.longitude),
    radiusMeters: String(activity.radiusMeters),
    instructions: activity.instructions ?? '',
    attendanceOpensMinutesBefore: String(activity.attendanceOpensMinutesBefore),
    attendanceClosesMinutesAfter: String(activity.attendanceClosesMinutesAfter),
  }
}

// Converts form strings into API values (UTC ISO strings for the date-times, numbers
// for the numeric fields). Returns { values, errors } so problems the browser can
// spot are shown against the field; everything else is validated by the server.
function toApiValues(form, fields) {
  const values = {}
  const errors = {}
  for (const field of fields) {
    const raw = form[field]
    if (REQUIRED.includes(field) && raw.trim() === '') {
      errors[field] = 'This field is required'
    } else if (DATES.includes(field)) {
      const iso = fromLocalInput(raw)
      if (iso) values[field] = iso
      else errors[field] = 'Enter a valid date and time'
    } else if (NUMERIC.includes(field)) {
      const number = Number(raw)
      if (raw.trim() !== '' && Number.isFinite(number)) values[field] = number
      else errors[field] = 'Enter a number'
    } else {
      values[field] = raw
    }
  }
  return { values, errors }
}

// Creates an activity, or edits one when the route has an :id. On edit only the fields
// that changed are sent, so untouched values (such as the venue location) are never re-submitted.
export default function ActivityForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const loaded = useAsync((signal) => (editing ? activitiesApi.get(id, { signal }) : Promise.resolve(null)), [id])
  const activity = loaded.data

  const back = (
    <Button as={Link} to={editing ? `/admin/activities/${id}` : '/admin/activities'} variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      {editing ? 'Back to activity' : 'All activities'}
    </Button>
  )

  if (loaded.loading && !loaded.data && editing) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading activity…" />
      </div>
    )
  }
  if (loaded.error) {
    return (
      <>
        <PageHeader title="Edit activity" actions={back} />
        <ErrorState error={loaded.error} onRetry={loaded.error.status === 404 ? undefined : loaded.reload} />
      </>
    )
  }
  if (editing && !EDITABLE_ACTIVITY_STATUSES.includes(activity.status)) {
    return (
      <>
        <PageHeader title="Edit activity" actions={back} />
        <Alert tone="info" title={`This activity is ${activity.status.toLowerCase()}`}>It can no longer be edited.</Alert>
      </>
    )
  }

  // Keyed by id so the form state starts fresh for whichever activity is being edited.
  return <Form key={id ?? 'new'} activity={activity} editing={editing} back={back} onDone={(saved) => navigate(`/admin/activities/${saved.id}`)} />
}

function Form({ activity, editing, back, onDone }) {
  const initial = activity ? toForm(activity) : EMPTY_FORM
  const [form, setForm] = useState(initial)
  const [localErrors, setLocalErrors] = useState({})
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }))
    setLocalErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  // Fills latitude/longitude from the device's current position, leaving the radius
  // and everything else untouched. The admin can still review and edit the result
  // before submitting.
  const useCurrentLocation = async () => {
    setLocationError(null)
    setLocating(true)
    try {
      const { latitude, longitude } = await getPosition()
      setForm((previous) => ({ ...previous, latitude: String(latitude), longitude: String(longitude) }))
      setLocalErrors((previous) => ({ ...previous, latitude: undefined, longitude: undefined }))
    } catch (err) {
      setLocationError(err)
    } finally {
      setLocating(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const fields = editing ? Object.keys(form).filter((field) => form[field] !== initial[field]) : Object.keys(form)
    if (editing && fields.length === 0) {
      setNotice('Nothing has changed yet.')
      return
    }
    const { values, errors } = toApiValues(form, fields)
    setLocalErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const saved = editing ? await activitiesApi.update(activity.id, values) : await activitiesApi.create(values)
      onDone(saved)
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  const fieldError = (field) => localErrors[field] ?? error?.fieldError(field)
  const knownFields = Object.keys(EMPTY_FORM)
  const showAlert = error && !knownFields.some((field) => error.fieldError(field))
  const locked = Boolean(activity?.locationLocked)
  const props = (field) => ({ value: form[field], onChange: update(field), error: fieldError(field) })

  return (
    <>
      <PageHeader title={editing ? 'Edit activity' : 'New activity'} description={editing ? activity.title : 'It stays a draft until you open it for volunteers'} actions={back} />

      <form onSubmit={submit} noValidate className="space-y-6">
        {showAlert && <Alert tone="error">{error.message}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6">About the activity</h2>
          <div className="space-y-5">
            <TextField label="Title" maxLength={ACTIVITY_LIMITS.title} required {...props('title')} />
            <div>
              <label htmlFor="activity-category" className="block text-gray-700 font-medium mb-2">Category</label>
              <Select id="activity-category" required aria-invalid={fieldError('category') ? true : undefined} value={form.category} onChange={update('category')}>
                <option value="" disabled>Choose a category</option>
                {ACTIVITY_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              {fieldError('category') && <p className="mt-1 text-sm text-red-600">{fieldError('category')}</p>}
            </div>
            <TextField label="Description" multiline rows={5} maxLength={ACTIVITY_LIMITS.description} required {...props('description')} />
            <TextField
              label="Instructions for volunteers"
              multiline
              rows={3}
              maxLength={ACTIVITY_LIMITS.instructions}
              hint="Optional. What to bring, where to meet, who to ask for."
              {...props('instructions')}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6">When</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <TextField label="Starts" type="datetime-local" required {...props('startsAt')} />
            <TextField label="Ends" type="datetime-local" required hint="Times are in your local time zone. At most 7 days long." {...props('endsAt')} />
            <TextField
              label="Attendance opens (minutes before start)"
              type="number"
              inputMode="numeric"
              min="0"
              max="240"
              step="1"
              {...props('attendanceOpensMinutesBefore')}
            />
            <TextField
              label="Attendance closes (minutes after end)"
              type="number"
              inputMode="numeric"
              min="0"
              max="240"
              step="1"
              {...props('attendanceClosesMinutesAfter')}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Where</h2>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <TextField label="Venue name" maxLength={ACTIVITY_LIMITS.locationName} required {...props('locationName')} />
              <TextField label="Address" maxLength={ACTIVITY_LIMITS.address} hint="Optional." {...props('address')} />
            </div>
            {locked && (
              <Alert tone="info" title="The location is locked">
                Volunteers have already checked in, so the coordinates and radius can no longer change.
              </Alert>
            )}
            {!locked && (
              <div>
                <Button type="button" variant="secondary" size="sm" onClick={useCurrentLocation} loading={locating} disabled={locating}>
                  {!locating && <LocateFixed className="w-4 h-4" aria-hidden="true" />}
                  Use my current location
                </Button>
                {locationError && <p className="mt-2 text-sm text-red-600">{locationError.message}</p>}
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-5">
              <TextField label="Latitude" type="number" inputMode="decimal" step="any" required disabled={locked} hint="For example 18.5204" {...props('latitude')} />
              <TextField label="Longitude" type="number" inputMode="decimal" step="any" required disabled={locked} hint="For example 73.8567" {...props('longitude')} />
              <TextField label="Check-in radius (metres)" type="number" inputMode="numeric" step="1" required disabled={locked} hint="25 to 5000" {...props('radiusMeters')} />
            </div>
            <p className="text-sm text-gray-500">Tip: use "Use my current location" at the venue, or in a maps app press and hold the venue and copy the coordinates shown.</p>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={submitting}>{editing ? 'Save changes' : 'Create activity'}</Button>
          <Button as={Link} to={editing ? `/admin/activities/${activity.id}` : '/admin/activities'} variant="ghost">Cancel</Button>
        </div>
      </form>
    </>
  )
}
