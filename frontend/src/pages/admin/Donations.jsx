import { Link } from 'react-router-dom'
import { DollarSign } from 'lucide-react'
import { donationsApi } from '../../api/donations'
import { Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'

const PAGE_SIZE = 20

export default function Donations() {
  const { page, update } = useListParams()
  const { data, error, loading, reload } = useAsync(
    (signal) => donationsApi.list({ page, limit: PAGE_SIZE }, { signal }),
    [page]
  )

  return (
    <>
      <PageHeader title="Donations" description="Manage donations and track their impact" />

      {loading && !data && (
        <div className="py-16 flex justify-center text-primary-600">
          <Spinner className="w-8 h-8" label="Loading donations…" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.items.length === 0 && (
        <Card>
          <EmptyState
            icon={DollarSign}
            title="No donations yet"
            description="Donations will appear here once they are created."
            action={page > 1 ? (
              <Button variant="secondary" size="sm" onClick={() => update({ page: 1 })}>
                Back to the first page
              </Button>
            ) : null}
          />
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className={`space-y-4 ${loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
          {data.items.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-900">${item.amount}</p>
                  <p className="text-xs text-gray-500">Donated {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              {item.activity && (
                <p className="text-sm text-gray-600">
                  Linked to:{' '}
                  <Link to={`/admin/activities/${item.activity.id}`} className="text-primary-600 hover:underline">
                    {item.activity.title}
                  </Link>
                </p>
              )}
              <div className="mt-3">
                <Button as={Link} to={`/admin/donations/${item.id}`} variant="secondary" size="sm">
                  View details
                </Button>
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
