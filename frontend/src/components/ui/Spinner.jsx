import { Loader2 } from 'lucide-react'

export default function Spinner({ className = 'w-5 h-5', label }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  )
}

// Fills the viewport; used while a guarded route waits for the session check.
export function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-primary-600">
      <Spinner className="w-8 h-8" label={label} />
    </div>
  )
}
