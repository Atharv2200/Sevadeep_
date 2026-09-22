import { useState } from 'react'
import ContributionPhotos from './ContributionPhotos'
import ReviewOutcome from './ReviewOutcome'
import { Alert, Button, StatusBadge, TextField } from '../ui'
import { contributionsApi } from '../../api/contributions'
import { CONTRIBUTION_LIMITS } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'

// One volunteer's account of one attendance: submit it (with optional photos),
// edit it while it waits, and see the outcome once an admin reviews it.
// `contribution` is null until one has been submitted; `onChange` receives the
// server's copy after every save. Photos may be added and removed independently
// of the description, and only while the contribution is still PENDING.
export default function ContributionPanel({ attendanceId, contribution, onChange, onConflict }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [staged, setStaged] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const startEditing = () => {
    setDescription(contribution.description)
    setError(null)
    setEditing(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const saved = contribution
        ? await contributionsApi.update(contribution.id, { description })
        : await contributionsApi.create({ attendance: attendanceId, description, photos: staged.map((item) => item.file) })
      onChange(saved)
      setEditing(false)
      setStaged([])
    } catch (err) {
      // A conflict means the contribution already exists or was reviewed since it
      // was loaded here: show it, and let the caller refresh to the current state
      // instead of silently retrying with what is now stale information.
      if (err.status === 409) {
        setError(err)
        onConflict?.()
      } else {
        setError(err)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const descriptionError = error?.fieldError('description')
  const showForm = !contribution || editing

  if (showForm) {
    return (
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && !descriptionError && <Alert tone={error.status === 409 ? 'info' : 'error'}>{error.message}</Alert>}
        <TextField
          label="What did you do?"
          multiline
          rows={4}
          maxLength={CONTRIBUTION_LIMITS.description}
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={descriptionError}
        />
        {!contribution && <ContributionPhotos mode="staged" staged={staged} onStagedChange={setStaged} />}
        <div className="flex gap-2">
          <Button type="submit" loading={submitting} disabled={description.trim() === ''}>
            {contribution ? 'Save changes' : 'Submit contribution'}
          </Button>
          {contribution && (
            <Button type="button" variant="ghost" disabled={submitting} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={contribution.status} />
        {contribution.status === 'PENDING' && (
          <Button variant="secondary" size="sm" onClick={startEditing}>
            Edit
          </Button>
        )}
      </div>
      <p className="text-gray-700 whitespace-pre-line break-words">{contribution.description}</p>
      <p className="text-xs text-gray-500">
        Submitted {formatDateTime(contribution.createdAt)}
        {contribution.updatedAt !== contribution.createdAt && ` · Updated ${formatDateTime(contribution.updatedAt)}`}
      </p>
      <ContributionPhotos
        mode={contribution.status === 'PENDING' ? 'manage' : 'readonly'}
        photos={contribution.photos}
        photoUrlFor={(photoId) => contributionsApi.photoUrl(contribution.id, photoId)}
        contributionId={contribution.id}
        onChange={onChange}
      />
      <ReviewOutcome contribution={contribution} />
    </div>
  )
}
