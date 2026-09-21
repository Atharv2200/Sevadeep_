import { CalendarX, Search } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import ActivityCard from '../../components/activity/ActivityCard'
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'
import { ACTIVITY_CATEGORIES } from '../../lib/constants'

const PAGE_SIZE = 12

// Volunteers browse the upcoming OPEN activities. What they may see is decided by
// the server; this page only asks for it.
export default function Activities() {
  const { search, page, values, text, setText, update, filtered } = useListParams(['category'])
  const { category } = values

  const { data, error, loading, reload } = useAsync(
    (signal) => activitiesApi.list({ page, limit: PAGE_SIZE, search, category }, { signal }),
    [page, search, category]
  )

  return (
    <>
      <PageHeader title="Activities" description="Upcoming Sevadeep activities you can take part in" />

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
          <Select aria-label="Filter by category" className="md:w-56" value={category} onChange={(event) => update({ category: event.target.value })}>
            <option value="">All categories</option>
            {ACTIVITY_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      {loading && !data && (
        <div className="py-16 flex justify-center text-primary-600">
          <Spinner className="w-8 h-8" label="Loading activities…" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.items.length === 0 && (
        <Card>
          <EmptyState
            icon={CalendarX}
            title={filtered ? 'No activities match your search' : 'No upcoming activities right now'}
            description={filtered ? 'Try a different search or clear the filters.' : 'Check back soon — new activities appear here as soon as they open.'}
            action={page > 1 ? <Button variant="secondary" size="sm" onClick={() => update({ page: 1 })}>Back to the first page</Button> : undefined}
          />
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.items.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.items.length} total={data.total} onPage={(next) => update({ page: next })} />
        </div>
      )}
    </>
  )
}
