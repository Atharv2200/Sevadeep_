import { Link } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import { attendanceApi } from '../../api/attendance'
import { Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'
import { categoryLabel } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 20

// The volunteer's own attendance, newest first. The API returns only their records,
// with times and duration; nothing about where they were.
export default function History() {
  const { page, update } = useListParams()
  const { data, error, loading, reload } = useAsync((signal) => attendanceApi.list({ page, limit: PAGE_SIZE }, { signal }), [page])

  return (
    <>
      <PageHeader title="History" description="The activities you have attended" />

      {loading && !data && (
        <div className="py-16 flex justify-center text-primary-600">
          <Spinner className="w-8 h-8" label="Loading your history…" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.items.length === 0 && (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title="No attendance yet"
            description="When you check in to an activity it will be listed here."
            action={
              page > 1 ? (
                <Button variant="secondary" size="sm" onClick={() => update({ page: 1 })}>Back to the first page</Button>
              ) : (
                <Button as={Link} to="/volunteer/activities" size="sm">Browse activities</Button>
              )
            }
          />
        </Card>
      )}

      {data && data.items.length > 0 && (
        <Card className={`!p-0 overflow-hidden ${loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-600">
                  <th className="py-3 px-4 font-medium">Activity</th>
                  <th className="py-3 px-4 font-medium">Checked in</th>
                  <th className="py-3 px-4 font-medium">Checked out</th>
                  <th className="py-3 px-4 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <Link to={`/volunteer/activities/${item.activity.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                        {item.activity.title}
                      </Link>
                      <p className="text-xs text-gray-500">{categoryLabel(item.activity.category)} · {item.activity.locationName}</p>
                    </td>
                    <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatDateTime(item.checkedInAt)}</td>
                    <td className="py-4 px-4 text-gray-700 whitespace-nowrap">
                      {item.checkedOutAt ? (
                        formatDateTime(item.checkedOutAt)
                      ) : (
                        <Link to={`/attend/${item.activity.id}`} className="text-primary-600 hover:text-primary-700 font-medium">Not checked out</Link>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{item.durationMinutes != null ? `${item.durationMinutes} min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.items.length} total={data.total} onPage={(next) => update({ page: next })} />
          </div>
        </Card>
      )}
    </>
  )
}
