import { Alert } from '../ui'
import { formatHours } from '../../lib/format'

// What became of a contribution, in the wording a volunteer and an admin can both
// read: awaiting review, the hours it was approved for, or why it was not.
export default function ReviewOutcome({ contribution }) {
  const { status, approvedHours, review } = contribution

  if (status === 'PENDING') {
    return <Alert tone="info">Awaiting admin review.</Alert>
  }
  if (status === 'VERIFIED') {
    return (
      <Alert tone="success" title={`Approved: ${formatHours(approvedHours)}`}>
        {review?.note}
      </Alert>
    )
  }
  return (
    <Alert tone="error" title="Not approved">
      {review?.note || 'No reason was given.'}
    </Alert>
  )
}
