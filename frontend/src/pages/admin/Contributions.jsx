import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { contributionsApi } from '../../api/contributions'
import { Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'
import { CONTRIBUTION_STATUSES } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 20

// Every contribution volunteers have submitted, newest first. Driven by the URL
// (?status=&page=), so a filtered view survives a refresh or a shared link.
export default function Contributions() {
  const { page, values, update, filtered } = useListParams(['status'])
  const { status } = values

  const { data, error, loading, reload } = useAsync(
    (signal) => contributionsApi.list({ page, limit: PAGE_SIZE, status }, { signal }),
    [page, status]
  )

  return (
    <>
      <PageHeader title="Contributions" description="Review what volunteers have submitted" />

      <Card className="mb-6 !p-4 md:!p-6">
        <Select aria-label="Filter by status" className="md:w-56" value={status} onChange={(event) => update({ status: event.target.value })}>
          <option value="">All statuses</option>
          {CONTRIBUTION_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading && !data && (
          <div className="py-16 flex justify-center text-primary-600">
            <Spinner className="w-8 h-8" label="Loading contributions…" />
          </div>
        )}
        {error && <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>}

        {data && data.items.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title={filtered ? 'No contributions match this filter' : 'No contributions yet'}
            description={filtered ? 'Try a different filter.' : 'Contributions appear here once volunteers submit them.'}
            action={page > 1 ? <Button variant="secondary" size="sm" onClick={() => update({ page: 1 })}>Back to the first page</Button> : undefined}
          />
        )}

        {data && data.items.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-600">
                    <th className="py-3 px-4 font-medium">Volunteer</th>
                    <th className="py-3 px-4 font-medium">Activity</th>
                    <th className="py-3 px-4 font-medium">Submitted</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium"><span className="sr-only">Review</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <Link to={`/admin/volunteers/${item.volunteer.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                          {item.volunteer.name ?? 'Unknown volunteer'}
                        </Link>
                        <p className="text-xs text-gray-500">{item.volunteer.volunteerId}</p>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{item.activity?.title ?? 'Unavailable'}</td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                      <td className="py-4 px-4"><StatusBadge status={item.status} /></td>
                      <td className="py-4 px-4 text-right">
                        <Link to={`/admin/contributions/${item.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                          {item.status === 'PENDING' ? 'Review' : 'View'}
                        </Link>
                      </td>
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
