// Informational markers on an attendance record. They never mean the attendance was
// rejected; they tell an admin what to look at.
const FLAGS = {
  LOW_ACCURACY: { label: 'Low accuracy', hint: 'The device reported a weaker GPS fix than usual', tone: 'bg-yellow-100 text-yellow-800' },
  NEAR_BOUNDARY: { label: 'Near boundary', hint: 'Checked in close to the edge of the allowed radius', tone: 'bg-yellow-100 text-yellow-800' },
  EARLY: { label: 'Early', hint: 'Checked in before the activity started', tone: 'bg-gray-100 text-gray-700' },
  LATE: { label: 'Late', hint: 'Checked in after the activity ended', tone: 'bg-gray-100 text-gray-700' },
}

export default function AttendanceFlags({ flags }) {
  if (!flags?.length) return <span className="text-gray-400">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((flag) => {
        const { label, hint, tone } = FLAGS[flag] ?? { label: flag, hint: '', tone: 'bg-gray-100 text-gray-700' }
        return (
          <span key={flag} title={hint} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
            {label}
          </span>
        )
      })}
    </span>
  )
}
