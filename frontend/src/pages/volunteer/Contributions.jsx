import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { contributionsApi } from '../../api/contributions'
import ReviewOutcome from '../../components/contribution/ReviewOutcome'
import { Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'
import { categoryLabel } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 20

// Everything the volunteer has submitted, newest first, and what became of it.
// Editing happens from the activity page each one is tied to.
export default function Contributions() {
  const { page, update } = useListParams()
  const { data, error, loading, reload } = useAsync((signal) => contributionsApi.list({ page, limit: PAGE_SIZE }, { signal }), [page])

  return (
    <>
      <PageHeader title="Contributions" description="What you've submitted, and how it was reviewed" />

      {loading && !data && (
        <div className="py-16 flex justify-center text-primary-600">
          <Spinner className="w-8 h-8" label="Loading your contributions…" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.items.length === 0 && (
        <Card>
          <EmptyState
            icon={FileText}
            title="No contributions yet"
            description="Submit one from an activity you attended."
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
        <div className={`space-y-4 ${loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
          {data.items.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div>
                  {item.activity ? (
                    <Link to={`/volunteer/activities/${item.activity.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                      {item.activity.title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-gray-900">Activity no longer available</p>
                  )}
                  {item.activity && <p className="text-xs text-gray-500">{categoryLabel(item.activity.category)}</p>}
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-gray-700 whitespace-pre-line break-words">{item.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                Submitted {formatDateTime(item.createdAt)}
                {item.updatedAt !== item.createdAt && ` · Updated ${formatDateTime(item.updatedAt)}`}
              </p>
              <div className="mt-3">
                <ReviewOutcome contribution={item} />
              </div>
            </Card>
          ))}
          <Card className="!p-0">
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.items.length} total={data.total} onPage={(next) => update({ page: next })} />
          </Card>
        </div>
      )}
    </>
  )
}
