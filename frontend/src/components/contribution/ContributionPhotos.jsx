import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { Alert, Button } from '../ui'
import { contributionsApi } from '../../api/contributions'
import { CONTRIBUTION_PHOTO_LIMITS } from '../../lib/constants'
import { formatBytes } from '../../lib/format'

const { maxCount, maxBytes, allowedMimeTypes } = CONTRIBUTION_PHOTO_LIMITS

// Checks each picked file against the limits the server also enforces, and
// reports one readable message per problem file.
function validateFiles(files, roomLeft) {
  const errors = []
  const accepted = []
  const overflow = files.length > roomLeft ? files.length - roomLeft : 0
  const candidates = overflow > 0 ? files.slice(0, roomLeft) : files
  if (overflow > 0) {
    errors.push(`Only ${roomLeft} more photo${roomLeft === 1 ? '' : 's'} can be added (5 per contribution).`)
  }
  for (const file of candidates) {
    if (!allowedMimeTypes.includes(file.type)) {
      errors.push(`${file.name}: unsupported file type. Use JPEG, PNG or WebP.`)
    } else if (file.size > maxBytes) {
      errors.push(`${file.name}: too large (max ${formatBytes(maxBytes)}).`)
    } else {
      accepted.push(file)
    }
  }
  return { accepted, errors }
}

function Thumb({ src, alt, onRemove, removing, children }) {
  return (
    <li className="relative">
      <img src={src} alt={alt} className="w-full aspect-square object-cover rounded-lg border border-gray-200 bg-gray-50" />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label="Remove photo"
          className="absolute top-1 right-1 bg-white/90 hover:bg-white text-red-600 rounded-full p-1 shadow disabled:opacity-50"
        >
          {removing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
        </button>
      )}
      {children}
    </li>
  )
}

// Photos for one contribution, in three modes:
// - "readonly": just the uploaded photos (admin review, and volunteers once it is
//   no longer PENDING).
// - "staged": no contribution exists yet, so picked files are kept locally
//   (preview + remove) until the caller submits them alongside the description.
// - "manage": the contribution exists and is PENDING — adding and removing a
//   photo each take effect immediately.
export default function ContributionPhotos({
  mode,
  photos = [],
  photoUrlFor,
  contributionId,
  staged,
  onStagedChange,
  onChange,
}) {
  const inputRef = useRef(null)
  const [errors, setErrors] = useState([])
  const [uploading, setUploading] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  // Local object URLs are only ever created here, so they are only ever revoked here.
  useEffect(() => () => staged?.forEach((item) => URL.revokeObjectURL(item.previewUrl)), [staged]) // eslint-disable-line react-hooks/exhaustive-deps

  const existingCount = photos.length
  const stagedCount = staged?.length ?? 0
  const roomLeft = maxCount - existingCount - stagedCount
  const canAdd = mode !== 'readonly' && roomLeft > 0

  const pickFiles = async (event) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (picked.length === 0) return
    const { accepted, errors: validationErrors } = validateFiles(picked, roomLeft)
    setErrors(validationErrors)
    if (accepted.length === 0) return

    if (mode === 'staged') {
      onStagedChange([...staged, ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))])
      return
    }

    setUploading(true)
    try {
      const updated = await contributionsApi.addPhotos(contributionId, accepted)
      onChange(updated)
    } catch (err) {
      setErrors([err.message])
    } finally {
      setUploading(false)
    }
  }

  const removeStaged = (index) => {
    const target = staged[index]
    URL.revokeObjectURL(target.previewUrl)
    onStagedChange(staged.filter((_, i) => i !== index))
  }

  const removeExisting = async (photoId) => {
    setErrors([])
    setRemovingId(photoId)
    try {
      const updated = await contributionsApi.removePhoto(contributionId, photoId)
      onChange(updated)
    } catch (err) {
      setErrors([err.message])
    } finally {
      setRemovingId(null)
    }
  }

  if (mode === 'readonly' && photos.length === 0) return null

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert tone="error">
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {(photos.length > 0 || stagedCount > 0) && (
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <Thumb
              key={photo.id}
              src={photoUrlFor(photo.id)}
              alt={photo.originalName}
              onRemove={mode === 'manage' ? () => removeExisting(photo.id) : undefined}
              removing={removingId === photo.id}
            />
          ))}
          {staged?.map((item, index) => (
            <Thumb key={item.previewUrl} src={item.previewUrl} alt="Selected photo" onRemove={() => removeStaged(index)} />
          ))}
        </ul>
      )}

      {canAdd && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={allowedMimeTypes.join(',')}
            multiple
            onChange={pickFiles}
            className="sr-only"
            aria-label="Add photos"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="w-4 h-4" aria-hidden="true" />
            Add photos
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            Up to {maxCount} photos, {formatBytes(maxBytes)} each. JPEG, PNG or WebP.
          </p>
        </div>
      )}
    </div>
  )
}
