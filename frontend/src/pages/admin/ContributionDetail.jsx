import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { contributionsApi } from '../../api/contributions'
import ContributionPhotos from '../../components/contribution/ContributionPhotos'
import ReviewOutcome from '../../components/contribution/ReviewOutcome'
import { Alert, Button, Card, ErrorState, PageHeader, Spinner, StatusBadge, TextField } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { APPROVED_HOURS_STEP, CONTRIBUTION_LIMITS, MAX_APPROVED_HOURS, categoryLabel } from '../../lib/constants'
import { formatDateTime, formatHours } from '../../lib/format'

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 break-words">{children}</dd>
    </div>
  )
}

// The admin's view of one contribution: what the volunteer submitted, what the
// attendance record suggests, and — while it is still PENDING — the review form.
// Every decision (whether it can still be reviewed, whether hours are valid) is the
// server's; a conflict here means someone else got there first, so the latest copy
// is reloaded and shown instead of retrying blindly.
export default function ContributionDetail() {
  const { id } = useParams()
  const { data: contribution, error, loading, reload } = useAsync((signal) => contributionsApi.get(id, { signal }), [id])
  const [conflict, setConflict] = useState(null)

  const back = (
    <Button as={Link} to="/admin/contributions" variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      All contributions
    </Button>
  )

  if (loading && !contribution) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading contribution…" />
      </div>
    )
  }
  if (error) {
    return (
      <>
        <PageHeader title="Contribution" actions={back} />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    )
  }

  const handleConflict = (err) => {
    setConflict(err.message)
    reload()
  }

  return (
    <>
      <PageHeader title={contribution.activity?.title ?? 'Contribution'} description={contribution.volunteer.name} actions={back} />

      {conflict && (
        <Alert tone="info" title="This contribution changed" className="mb-6">
          {conflict} Showing the current state below.
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Submitted description</h2>
              <StatusBadge status={contribution.status} />
            </div>
            <p className="text-gray-700 whitespace-pre-line break-words">{contribution.description}</p>
            {contribution.photos?.length > 0 && (
              <div className="mt-4">
                <ContributionPhotos
                  mode="readonly"
                  photos={contribution.photos}
                  photoUrlFor={(photoId) => contributionsApi.photoUrl(contribution.id, photoId)}
                />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance</h2>
            <dl className="grid sm:grid-cols-2 gap-6">
              <Field label="Checked in">{formatDateTime(contribution.attendance.checkedInAt)}</Field>
              <Field label="Checked out">{contribution.attendance.checkedOutAt ? formatDateTime(contribution.attendance.checkedOutAt) : 'Not checked out'}</Field>
              <Field label="Suggested duration">
                {contribution.suggestedHours != null ? formatHours(contribution.suggestedHours) : 'Not available (no check-out)'}
              </Field>
            </dl>
          </Card>

          {contribution.status !== 'PENDING' && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Outcome</h2>
              <ReviewOutcome contribution={contribution} />
              {contribution.review.reviewedAt && (
                <p className="text-xs text-gray-500 mt-3">Reviewed {formatDateTime(contribution.review.reviewedAt)}</p>
              )}
            </Card>
          )}
        </div>

        <div className="self-start space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Who and what</h2>
            <dl className="space-y-4">
              <Field label="Volunteer">
                <Link to={`/admin/volunteers/${contribution.volunteer.id}`} className="text-primary-600 hover:text-primary-700">
                  {contribution.volunteer.name}
                </Link>
                <span className="block text-xs text-gray-500 font-normal">{contribution.volunteer.volunteerId}</span>
              </Field>
              {contribution.activity && (
                <Field label="Activity">
                  <Link to={`/admin/activities/${contribution.activity.id}`} className="text-primary-600 hover:text-primary-700">
                    {contribution.activity.title}
                  </Link>
                  <span className="block text-xs text-gray-500 font-normal">{categoryLabel(contribution.activity.category)}</span>
                </Field>
              )}
              <Field label="Submitted">{formatDateTime(contribution.createdAt)}</Field>
            </dl>
          </Card>

          {contribution.status === 'PENDING' ? (
            <ReviewForm
              contribution={contribution}
              onReviewed={() => { setConflict(null); reload() }}
              onConflict={handleConflict}
            />
          ) : (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Review</h2>
              <p className="text-sm text-gray-600">This contribution has already been reviewed and can no longer be changed.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

// Picks a verdict, then asks for what that verdict needs: hours to verify, an
// optional note either way. `contribution.revision` always comes from the latest
// load, never from what was typed earlier, so a review always targets the version
// actually on screen.
function ReviewForm({ contribution, onReviewed, onConflict }) {
  const [verdict, setVerdict] = useState(null)
  const [approvedHours, setApprovedHours] = useState(contribution.suggestedHours != null ? String(contribution.suggestedHours) : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const hours = approvedHours.trim() === '' ? undefined : Number(approvedHours)
      await contributionsApi.review(contribution.id, {
        status: verdict,
        ...(verdict === 'VERIFIED' ? { approvedHours: hours } : {}),
        note: note.trim() === '' ? undefined : note,
        revision: contribution.revision,
      })
      onReviewed()
    } catch (err) {
      if (err.status === 409) onConflict(err)
      else setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const approvedHoursError = error?.fieldError('approvedHours')
  const noteError = error?.fieldError('note')
  const showAlert = error && !approvedHoursError && !noteError

  if (!verdict) {
    return (
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Review</h2>
        <p className="text-sm text-gray-600 mb-4">Verify to award hours, or reject with an optional note.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => setVerdict('VERIFIED')}>Verify</Button>
          <Button variant="danger" onClick={() => setVerdict('REJECTED')}>Reject</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{verdict === 'VERIFIED' ? 'Verify contribution' : 'Reject contribution'}</h2>
      <form onSubmit={submit} noValidate className="space-y-4">
        {showAlert && <Alert tone="error">{error.message}</Alert>}
        {verdict === 'VERIFIED' && (
          <TextField
            label="Approved hours"
            type="number"
            inputMode="decimal"
            step={APPROVED_HOURS_STEP}
            min={APPROVED_HOURS_STEP}
            max={MAX_APPROVED_HOURS}
            required
            hint={
              contribution.suggestedHours != null
                ? `Suggested: ${formatHours(contribution.suggestedHours)} (from check-in to check-out)`
                : 'No suggested duration is available (there is no check-out).'
            }
            value={approvedHours}
            onChange={(event) => setApprovedHours(event.target.value)}
            error={approvedHoursError}
          />
        )}
        <TextField
          label="Note (optional)"
          multiline
          rows={3}
          maxLength={CONTRIBUTION_LIMITS.reviewNote}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={noteError}
        />
        <div className="flex gap-2">
          <Button type="submit" variant={verdict === 'REJECTED' ? 'danger' : 'primary'} loading={submitting}>
            Confirm {verdict === 'VERIFIED' ? 'verification' : 'rejection'}
          </Button>
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => setVerdict(null)}>Back</Button>
        </div>
      </form>
    </Card>
  )
}
