import { Link } from 'react-router-dom'
import { CalendarClock, MapPin } from 'lucide-react'
import { Card } from '../ui'
import CategoryIcon from './CategoryIcon'
import { categoryLabel } from '../../lib/constants'
import { formatActivityTime } from '../../lib/format'

// One activity in the volunteer's browse list.
export default function ActivityCard({ activity }) {
  return (
    <Card as="article" className="!p-6 flex flex-col gap-4 card-hover">
      <div className="flex items-start gap-4">
        <CategoryIcon category={activity.category} />
        <div className="min-w-0">
          <p className="text-sm text-primary-700 font-medium">{categoryLabel(activity.category)}</p>
          <h2 className="text-xl font-bold text-gray-900 break-words">
            <Link to={`/volunteer/activities/${activity.id}`} className="hover:text-primary-600">
              {activity.title}
            </Link>
          </h2>
        </div>
      </div>

      <p className="text-gray-600 line-clamp-3 whitespace-pre-line">{activity.description}</p>

      <ul className="text-sm text-gray-600 space-y-1 mt-auto">
        <li className="flex items-center gap-2"><CalendarClock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />{formatActivityTime(activity.startsAt, activity.endsAt)}</li>
        <li className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />{activity.locationName}</li>
      </ul>

      {activity.attendance.isOpen && (
        <p className="text-sm font-semibold text-green-700">Attendance is open now</p>
      )}
    </Card>
  )
}
