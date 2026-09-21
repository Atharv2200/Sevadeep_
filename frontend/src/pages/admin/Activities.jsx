import { Link } from 'react-router-dom'
import { CalendarX, Plus, Search } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUSES, categoryLabel } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 20

// Every activity in every status, newest first. Driven by the URL (?search=&status=&category=&page=).
export default function Activities() {
  const { search, page, values, text, setText, update, filtered } = useListParams(['status', 'category'])
  const { status, category } = values

  const { data, error, loading, reload } = useAsync(
    (signal) => activitiesApi.list({ page, limit: PAGE_SIZE, search, status, category }, { signal }),
    [page, search, status, category]
  )

  return (
    <>
      <PageHeader
        title="Activities"
        description="Create and manage Sevadeep activities"
        actions={
          <Button as={Link} to="/admin/activities/new">
            <Plus className="w-4 h-4" aria-hidden="true" />
            New activity
          </Button>
        }
      />

      <Card className="mb-6 !p-4 md:!p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search activities"
              placeholder="Search by title…"
              className="!pl-10"
              maxLength={100}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <Select aria-label="Filter by status" className="md:w-44" value={status} onChange={(event) => update({ status: event.target.value })}>
            <option value="">All statuses</option>
            {ACTIVITY_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select aria-label="Filter by category" className="md:w-56" value={category} onChange={(event) => update({ category: event.target.value })}>
            <option value="">All categories</option>
            {ACTIVITY_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading && !data && (
          <div className="py-16 flex justify-center text-primary-600">
            <Spinner className="w-8 h-8" label="Loading activities…" />
          </div>
        )}
        {error && <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>}

        {data && data.items.length === 0 && (
          <EmptyState
            icon={CalendarX}
            title={filtered ? 'No activities match your search' : 'No activities have been created yet'}
            description={filtered ? 'Try a different search or clear the filters.' : 'Create the first activity to get started.'}
            action={
              page > 1 ? (
                <Button variant="secondary" size="sm" onClick={() => update({ page: 1 })}>Back to the first page</Button>
              ) : !filtered ? (
                <Button as={Link} to="/admin/activities/new" size="sm">New activity</Button>
              ) : undefined
            }
          />
        )}

        {data && data.items.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-600">
                    <th className="py-3 px-4 font-medium">Activity</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Starts</th>
                    <th className="py-3 px-4 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((activity) => (
                    <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <Link to={`/admin/activities/${activity.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                          {activity.title}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{categoryLabel(activity.category)}</td>
                      <td className="py-4 px-4"><StatusBadge status={activity.status} /></td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatDateTime(activity.startsAt)}</td>
                      <td className="py-4 px-4 text-gray-700">{activity.locationName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100">
              <Pagination page={page} pageSize={PAGE_SIZE} count={data.items.length} total={data.total} onPage={(next) => update({ page: next })} />
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
