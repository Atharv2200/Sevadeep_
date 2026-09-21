import Alert from './Alert'
import Button from './Button'

// Shown when data failed to load. `error` is an ApiError (or any Error).
export default function ErrorState({ error, onRetry }) {
  return (
    <div className="space-y-4">
      <Alert tone="error" title="We couldn't load this">
        {error?.message ?? 'Something went wrong.'}
      </Alert>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
