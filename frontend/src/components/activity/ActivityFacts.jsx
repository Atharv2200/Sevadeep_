import { CalendarClock, Clock, MapPin, Radar } from 'lucide-react'
import { formatActivityTime, formatDateTime } from '../../lib/format'

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <dt className="text-sm text-gray-500">{label}</dt>
        <dd className="font-medium text-gray-900 break-words">{children}</dd>
      </div>
    </div>
  )
}

// The facts a volunteer or admin needs about an activity. The attendance window
// comes from the server (`activity.attendance`); it is displayed, never computed here.
export default function ActivityFacts({ activity }) {
  const { attendance } = activity
  return (
    <dl className="grid sm:grid-cols-2 gap-6">
      <Fact icon={CalendarClock} label="When">{formatActivityTime(activity.startsAt, activity.endsAt)}</Fact>
      <Fact icon={MapPin} label="Where">
        {activity.locationName}
        {activity.address && <span className="block text-sm font-normal text-gray-600">{activity.address}</span>}
      </Fact>
      <Fact icon={Clock} label="Attendance window">
        {formatDateTime(attendance.opensAt)} – {formatDateTime(attendance.closesAt)}
      </Fact>
      <Fact icon={Radar} label="Check-in radius">{activity.radiusMeters} m from the venue</Fact>
    </dl>
  )
}
