import { Link } from 'react-router-dom'
import AttendanceFlags from './AttendanceFlags'
import { formatDateTime } from '../../lib/format'

// Attendance records as an admin sees them: who (or which activity), when, and the
// evidence the server recorded. `mode` is 'activity' (rows are volunteers) or
// 'volunteer' (rows are activities).
export default function AttendanceTable({ items, mode = 'activity' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-600">
            <th className="py-3 px-4 font-medium">{mode === 'activity' ? 'Volunteer' : 'Activity'}</th>
            <th className="py-3 px-4 font-medium">Checked in</th>
            <th className="py-3 px-4 font-medium">Checked out</th>
            <th className="py-3 px-4 font-medium">Distance</th>
            <th className="py-3 px-4 font-medium">Accuracy</th>
            <th className="py-3 px-4 font-medium">Flags</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                {mode === 'activity' ? (
                  <>
                    <Link to={`/admin/volunteers/${item.volunteer.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                      {item.volunteer.name ?? 'Unknown volunteer'}
                    </Link>
                    <p className="text-xs text-gray-500">{item.volunteer.volunteerId}</p>
                  </>
                ) : (
                  <Link to={`/admin/activities/${item.activity.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                    {item.activity.title}
                  </Link>
                )}
              </td>
              <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{formatDateTime(item.checkedInAt)}</td>
              <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                {item.checkedOutAt ? (
                  <>
                    {formatDateTime(item.checkedOutAt)}
                    {item.durationMinutes != null && <span className="block text-xs text-gray-500">{item.durationMinutes} min</span>}
                  </>
                ) : (
                  <span className="text-gray-400">Not yet</span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{Math.round(item.checkIn.distanceMeters)} m</td>
              <td className="py-3 px-4 text-gray-700 whitespace-nowrap">±{Math.round(item.checkIn.accuracy)} m</td>
              <td className="py-3 px-4"><AttendanceFlags flags={item.flags} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
