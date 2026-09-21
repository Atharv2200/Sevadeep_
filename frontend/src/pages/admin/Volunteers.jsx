import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { volunteersApi } from '../../api/volunteers'
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatDateTime } from '../../lib/format'

const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

// The list is driven by the URL (?search=&status=&page=), so a refresh, the back
// button and shared links all keep the same view.
export default function Volunteers() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const requestedPage = Number(params.get('page'))
  const page = Number.isInteger(requestedPage) && requestedPage > 1 ? requestedPage : 1

  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value && !(key === 'page' && value === 1)) next.set(key, String(value))
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  // Typing is debounced into the URL so each keystroke does not hit the API. The
  // input follows the URL when it changes from outside (back button, shared link).
  const [text, setText] = useState(search)
  useEffect(() => setText(search), [search])
  useEffect(() => {
    if (text === search) return undefined
    const timer = setTimeout(() => update({ search: text.trim() === '' ? '' : text, page: 1 }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
    // `update` is recreated every render; only the typed text and the applied search matter here.
  }, [text, search])

  const { data, error, loading, reload } = useAsync(
    (signal) => volunteersApi.list({ page, limit: PAGE_SIZE, search, status }, { signal }),
    [page, search, status]
  )

  const filtered = Boolean(search || status)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <>
      <PageHeader title="Volunteers" description="Everyone who has registered with Sevadeep" />

      <Card className="mb-6 !p-4 md:!p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search volunteers"
              placeholder="Search by name, volunteer ID or email…"
              className="!pl-10"
              maxLength={100}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <Select aria-label="Filter by status" className="md:w-48" value={status} onChange={(event) => update({ status: event.target.value, page: 1 })}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading && !data && (
          <div className="py-16 flex justify-center text-primary-600">
            <Spinner className="w-8 h-8" label="Loading volunteers…" />
          </div>
        )}
        {error && <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>}

        {data && data.items.length === 0 && (
          <EmptyState
            icon={Users}
            title={filtered ? 'No volunteers match your search' : 'No volunteers have registered yet'}
            description={filtered ? 'Try a different search or clear the filters.' : 'New volunteers appear here as soon as they sign up.'}
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
                    <th className="py-3 px-4 font-medium">Email</th>
                    <th className="py-3 px-4 font-medium">Phone</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Joined</th>
                    <th className="py-3 px-4 font-medium">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((volunteer) => (
                    <tr key={volunteer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <Link to={`/admin/volunteers/${volunteer.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                          {volunteer.name}
                        </Link>
                        <p className="text-xs text-gray-500">{volunteer.volunteerId}</p>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{volunteer.email}</td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{volunteer.phone}</td>
                      <td className="py-4 px-4"><StatusBadge status={volunteer.status} /></td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatDate(volunteer.joinedAt)}</td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">{formatDateTime(volunteer.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 border-t border-gray-100 text-sm text-gray-600">
              <p>
                Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + data.items.length} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <span>Page {page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
