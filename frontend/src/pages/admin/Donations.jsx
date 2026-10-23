import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, Plus, Search, Filter, Users, CheckCircle, Clock, HeartHandshake, X } from 'lucide-react'
import { donationsApi } from '../../api/donations'
import { activitiesApi } from '../../api/activities'
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge, TextField } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 15

const STATUS_FILTERS = [
  { label: 'All Donations', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processed', value: 'PROCESSED' },
  { label: 'Allocated', value: 'ALLOCATED' },
]

function RecordDonationModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [activity, setActivity] = useState('')
  const [status, setStatus] = useState('PROCESSED')
  const [note, setNote] = useState('')

  const [activities, setActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Load activities for optional linkage
  useState(() => {
    activitiesApi
      .list({ limit: 50 })
      .then((res) => setActivities(res.items || []))
      .catch((err) => console.error('Failed to load activities for modal:', err))
      .finally(() => setLoadingActivities(false))
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const num = Number(amount)
    if (!num || num < 1) {
      setError('Please enter a valid donation amount of at least ₹1')
      return
    }

    setSubmitting(true)
    try {
      await donationsApi.create({
        amount: num,
        donorName: donorName.trim() || undefined,
        donorEmail: donorEmail.trim() || undefined,
        activity: activity || undefined,
        status,
        note: note.trim() || undefined,
      })
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to record donation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Record New Donation</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Donation Amount (₹) *"
            type="number"
            min="1"
            required
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Donor Name"
              placeholder="e.g. Rajesh Mehra"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
            <TextField
              label="Donor Email"
              type="email"
              placeholder="donor@example.com"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Linked Cause / Activity (Optional)
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              disabled={loadingActivities}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm text-gray-900"
            >
              <option value="">🌟 General Fund (No specific activity)</option>
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.title} ({act.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Donation Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm text-gray-900"
            >
              <option value="PROCESSED">PROCESSED (Funds Received)</option>
              <option value="ALLOCATED">ALLOCATED (Assigned to Causes)</option>
              <option value="PENDING">PENDING (Awaiting Verification/Clearance)</option>
            </select>
          </div>

          <TextField
            label="Admin Note / Reference"
            multiline
            rows={2}
            placeholder="e.g. Cheque clearance ref #48291, Cash collection receipt"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button onClick={onClose} variant="secondary" type="button">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} variant="primary">
              Record Donation
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Donations() {
  const { page, query, update } = useListParams({ defaults: { status: '', search: '' } })

  const { data, error, loading, reload } = useAsync(
    (signal) =>
      donationsApi.list(
        {
          page,
          limit: PAGE_SIZE,
          status: query.status || undefined,
          search: query.search || undefined,
        },
        { signal }
      ),
    [page, query.status, query.search]
  )

  const [showRecordModal, setShowRecordModal] = useState(false)
  const [searchInput, setSearchInput] = useState(query.search || '')

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    update({ search: searchInput, page: 1 })
  }

  const handleStatusChange = (newStatus) => {
    update({ status: newStatus, page: 1 })
  }

  const stats = data?.stats

  return (
    <>
      <PageHeader
        title="Donations & Impact"
        description="Monitor grassroots contributions, allocate funds to field activities, and track volunteer evidence"
        actions={
          <Button onClick={() => setShowRecordModal(true)} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Record Donation
          </Button>
        }
      />

      {/* Top Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="!p-4 bg-gradient-to-br from-primary-50 to-orange-50 border-primary-200">
            <div className="flex items-center gap-2 mb-1 text-primary-700 text-xs font-bold uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              Total Contributions
            </div>
            <div className="text-2xl font-extrabold text-gray-900">
              ₹{(stats.totalAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{stats.totalCount || 0} donations total</p>
          </Card>

          <Card className="!p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-1 text-green-700 text-xs font-bold uppercase tracking-wider">
              <CheckCircle className="w-4 h-4" />
              Allocated to Causes
            </div>
            <div className="text-2xl font-extrabold text-green-900">
              ₹{(stats.allocatedAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-green-700 mt-0.5">{stats.allocatedCount || 0} donations assigned</p>
          </Card>

          <Card className="!p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-1 text-blue-700 text-xs font-bold uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4" />
              Processed / General
            </div>
            <div className="text-2xl font-extrabold text-blue-900">
              ₹{(stats.processedAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-blue-700 mt-0.5">{stats.processedCount || 0} ready to allocate</p>
          </Card>

          <Card className="!p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2 mb-1 text-amber-700 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              Pending Verification
            </div>
            <div className="text-2xl font-extrabold text-amber-900">
              ₹{(stats.pendingAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-amber-700 mt-0.5">{stats.pendingCount || 0} awaiting review</p>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="mb-6 !p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const active = (query.status || '') === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => handleStatusChange(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Search Field */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search donor or note…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-1 focus:ring-primary-200 outline-none"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </div>
      </Card>

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
            title="No donations found"
            description={
              query.status || query.search
                ? 'No contributions matched your filter criteria.'
                : 'No donations recorded yet. Click "Record Donation" to add your first contribution.'
            }
            action={
              query.status || query.search ? (
                <Button variant="secondary" size="sm" onClick={() => update({ status: '', search: '', page: 1 })}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setShowRecordModal(true)} variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Record Donation
                </Button>
              )
            }
          />
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className={`space-y-4 ${loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
          {data.items.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg mt-0.5">
                    ₹
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xl text-gray-900">₹{item.amount.toLocaleString()}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Donated by <strong className="text-gray-700">{item.donor?.name || 'Anonymous'}</strong>
                      {item.donor?.email ? ` (${item.donor.email})` : ''} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>

                <Button as={Link} to={`/admin/donations/${item.id}`} variant="secondary" size="sm">
                  View details & impact
                </Button>
              </div>

              <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 gap-1.5">
                <div>
                  <span className="text-gray-500">Designation: </span>
                  {item.activity ? (
                    <Link
                      to={`/admin/activities/${item.activity.id}`}
                      className="text-primary-600 hover:underline font-semibold"
                    >
                      {item.activity.title} ({item.activity.category})
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-700">General Grassroots Impact Fund</span>
                  )}
                </div>

                {item.note && (
                  <p className="italic text-gray-500 truncate max-w-md">"{item.note}"</p>
                )}
              </div>
            </Card>
          ))}

          <Card className="!p-0">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              count={data.items.length}
              total={data.total}
              onPage={(next) => update({ page: next })}
            />
          </Card>
        </div>
      )}

      {showRecordModal && (
        <RecordDonationModal
          onClose={() => setShowRecordModal(false)}
          onSuccess={() => {
            setShowRecordModal(false)
            reload()
          }}
        />
      )}
    </>
  )
}
