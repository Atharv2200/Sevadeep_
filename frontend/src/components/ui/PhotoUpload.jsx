import { useState } from 'react'
import { Camera, X, Upload } from 'lucide-react'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export default function PhotoUpload({ value = [], onChange, maxPhotos = 5, required = false }) {
  const [previews, setPreviews] = useState([])

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    const newFiles = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`File ${file.name} is not a supported image type. Please use JPEG, PNG, or WebP.`)
        continue
      }

      if (file.size > MAX_SIZE) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        continue
      }

      newFiles.push(file)
    }

    if (newFiles.length === 0) return

    // Check total limit
    if (value.length + newFiles.length > maxPhotos) {
      alert(`You can only upload up to ${maxPhotos} photos total.`)
      return
    }

    // Create previews
    const newPreviews = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setPreviews((prev) => [...prev, ...newPreviews])
    onChange([...value, ...newFiles])

    // Reset input
    event.target.value = ''
  }

  const handleRemove = (index) => {
    const newValue = value.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)

    // Revoke object URL to free memory
    if (previews[index]?.preview) {
      URL.revokeObjectURL(previews[index].preview)
    }

    setPreviews(newPreviews)
    onChange(newValue)
  }

  const canAddMore = value.length < maxPhotos

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {previews.map((item, index) => (
          <div key={index} className="relative group">
            <img
              src={item.preview}
              alt={`Upload ${index + 1}`}
              className="w-24 h-24 object-cover rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={!canAddMore}
            />
            <Camera className="w-6 h-6 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Add photo</span>
          </label>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {required && <span className="text-red-600">*</span>} Upload between 1 and {maxPhotos} photos as documentation (JPEG, PNG, or WebP, max 10MB each)
      </p>

      {value.length === 0 && required && (
        <p className="text-sm text-red-600">At least one photo is required</p>
      )}
    </div>
  )
}
