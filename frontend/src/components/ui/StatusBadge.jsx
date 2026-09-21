const TONES = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-700',
}

// Known account statuses. Later phases add their own (contribution, activity).
const STATUSES = {
  ACTIVE: { label: 'Active', tone: 'success' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
}

export default function StatusBadge({ status }) {
  const { label, tone } = STATUSES[status] ?? { label: status, tone: 'neutral' }
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${TONES[tone]}`}>{label}</span>
}
