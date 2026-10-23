import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  Sparkles,
  Users,
  Clock,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  FileText,
  User,
  X,
  ExternalLink,
} from 'lucide-react'
import { donationsApi } from '../../api/donations'
import { activitiesApi } from '../../api/activities'
import { aiApi } from '../../api/ai'
import { Alert, Button, Card, ErrorState, PageHeader, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime } from '../../lib/format'

function AllocateModal({ donationId, currentAllocated = [], onClose, onSuccess }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(currentAllocated.map((a) => a.id || a))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    activitiesApi
      .list({ limit: 50 })
      .then((res) => setActivities(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleActivity = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      setError('Please select at least one activity to allocate funds to.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await donationsApi.allocate(donationId, { activityIds: selectedIds })
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to allocate donation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Allocate Contribution</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <Alert tone="error" className="mb-3">{error}</Alert>}

        <p className="text-sm text-gray-600 mb-4">
          Select one or more active events or programs to receive these funds. Linked activities will track volunteer completions against this contribution.
        </p>

        {loading ? (
          <div className="py-12 flex justify-center text-primary-600">
            <Spinner className="w-6 h-6" label="Loading activities…" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-6">
            {activities.map((act) => {
              const checked = selectedIds.includes(act.id)
              return (
                <label
                  key={act.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checked
                      ? 'border-primary-600 bg-primary-50/50 text-gray-900'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleActivity(act.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-semibold text-sm">{act.title}</p>
                    <p className="text-xs text-gray-500">
                      {act.category} · Starts {new Date(act.startsAt).toLocaleDateString()}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button onClick={onClose} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} variant="primary" size="sm">
            Save Allocation ({selectedIds.length})
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function DonationDetail() {
  const { id } = useParams()
  const { data: donation, error, loading, reload } = useAsync((signal) => donationsApi.get(id, { signal }), [id])
  const { data: impact, loading: impactLoading, reload: reloadImpact } = useAsync(
    (signal) => donationsApi.getImpact(id, { signal }),
    [id]
  )

  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showAllocateModal, setShowAllocateModal] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [generatedReport, setGeneratedReport] = useState(null)
  const [reportError, setReportError] = useState(null)

  const back = (
    <Button as={Link} to="/admin/donations" variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
      All donations
    </Button>
  )

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await donationsApi.updateStatus(id, { status: newStatus })
      await reload()
      reloadImpact()
    } catch (err) {
      alert(err.message || 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const generateImpactReport = async () => {
    if (!impact) return
    setGeneratingReport(true)
    setReportError(null)
    try {
      const report = await aiApi.generateImpactReport(impact)
      setGeneratedReport(report.report)
    } catch (err) {
      setReportError(err)
    } finally {
      setGeneratingReport(false)
    }
  }

  if (loading && !donation) {
    return (
      <div className="py-20 flex justify-center text-primary-600">
        <Spinner className="w-8 h-8" label="Loading donation details…" />
      </div>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Donation Details" actions={back} />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Donation #${id.slice(-8).toUpperCase()}`}
        description="Comprehensive audit trail, cause allocations, and field verification proofs"
        actions={
          <div className="flex items-center gap-2">
            {back}
            <Button onClick={() => setShowAllocateModal(true)} variant="primary" size="sm">
              <Layers className="w-4 h-4 mr-1.5" />
              Allocate to Causes
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Core Donation Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-orange-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md">
                ₹
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-extrabold text-gray-900">
                    ₹{donation.amount.toLocaleString()}
                  </h2>
                  <StatusBadge status={donation.status} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Received on {formatDateTime(donation.createdAt)}
                </p>
              </div>
            </div>

            {/* Status Switcher */}
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600 px-2">Set Status:</span>
              <button
                disabled={updatingStatus || donation.status === 'PROCESSED'}
                onClick={() => handleStatusChange('PROCESSED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  donation.status === 'PROCESSED'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                PROCESSED
              </button>
              <button
                disabled={updatingStatus || donation.status === 'ALLOCATED'}
                onClick={() => handleStatusChange('ALLOCATED')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  donation.status === 'ALLOCATED'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                ALLOCATED
              </button>
              <button
                disabled={updatingStatus || donation.status === 'PENDING'}
                onClick={() => handleStatusChange('PENDING')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  donation.status === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                PENDING
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 pt-6 text-sm">
            {/* Contributor Profile */}
            <div className="space-y-3 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary-600" />
                Contributor Information
              </h3>
              <div>
                <span className="text-xs text-gray-500 block">Name</span>
                <span className="font-semibold text-gray-900">{donation.donor?.name || 'Anonymous Donor'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Email Address</span>
                <span className="text-gray-800">{donation.donor?.email || 'Not provided'}</span>
              </div>
              {donation.donor?.id && (
                <div>
                  <span className="text-xs text-gray-500 block">Registered User ID</span>
                  <span className="font-mono text-xs text-primary-700">{donation.donor.id}</span>
                </div>
              )}
            </div>

            {/* Allocation & Designation */}
            <div className="space-y-3 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary-600" />
                Cause & Program Allocations
              </h3>
              {donation.activity ? (
                <div>
                  <span className="text-xs text-gray-500 block">Direct Program Link</span>
                  <Link
                    to={`/admin/activities/${donation.activity.id}`}
                    className="font-semibold text-primary-600 hover:underline flex items-center gap-1"
                  >
                    {donation.activity.title} ({donation.activity.category})
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div>
                  <span className="text-xs text-gray-500 block">Designated Fund</span>
                  <span className="font-semibold text-gray-800">General Grassroots Community Fund</span>
                </div>
              )}

              <div>
                <span className="text-xs text-gray-500 block">Allocated To Activities</span>
                {donation.allocatedTo && donation.allocatedTo.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {donation.allocatedTo.map((act) => (
                      <Link
                        key={act.id}
                        to={`/admin/activities/${act.id}`}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-gray-200 text-gray-800 hover:border-primary-400 hover:text-primary-600 transition-colors inline-flex items-center gap-1"
                      >
                        {act.title}
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">Not yet assigned to specific activities.</span>
                )}
              </div>

              {donation.note && (
                <div>
                  <span className="text-xs text-gray-500 block">Donor Note</span>
                  <p className="text-xs text-gray-700 italic bg-white p-2 rounded border border-gray-100">
                    "{donation.note}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Impact & Proofs Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                Verified Volunteer Impact & Evidence
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                On-the-ground volunteer completions enabled by this contribution
              </p>
            </div>

            {!impactLoading && impact && (
              <Button
                onClick={generateImpactReport}
                loading={generatingReport}
                variant="primary"
                size="sm"
              >
                {!generatingReport && <Sparkles className="w-4 h-4 mr-1.5" />}
                Generate AI Impact Letter
              </Button>
            )}
          </div>

          {impactLoading && (
            <div className="py-12 flex justify-center text-primary-600">
              <Spinner className="w-8 h-8" label="Loading impact records…" />
            </div>
          )}

          {impact && (
            <div className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                  <Users className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <span className="text-2xl font-bold text-gray-900 block">{impact.totalCompletions}</span>
                  <span className="text-xs text-gray-600 font-medium">Volunteers Mobilized</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <span className="text-2xl font-bold text-gray-900 block">{impact.totalHours}h</span>
                  <span className="text-xs text-gray-600 font-medium">Verified Field Hours</span>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <span className="text-2xl font-bold text-gray-900 block">{impact.activities.length}</span>
                  <span className="text-xs text-gray-600 font-medium">Community Drives</span>
                </div>
              </div>

              {/* AI Report Card */}
              {generatedReport && (
                <div className="bg-gradient-to-br from-primary-50 to-orange-50 p-6 rounded-2xl border border-primary-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-600" />
                    AI-Generated Donor Letter (Powered by Groq)
                  </h3>
                  <div className="bg-white p-5 rounded-xl border border-primary-100 text-sm text-gray-800 whitespace-pre-line leading-relaxed shadow-sm font-sans">
                    {generatedReport}
                  </div>
                </div>
              )}

              {reportError && <Alert tone="error">{reportError.message}</Alert>}

              {/* Completions Evidence List */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Volunteer Field Completions</h3>
                {impact.completions.length > 0 ? (
                  <div className="space-y-3">
                    {impact.completions.map((completion) => (
                      <div
                        key={completion.id}
                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{completion.volunteer.name}</p>
                            <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                              {completion.volunteer.volunteerId}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Activity: <strong>{completion.activity.title}</strong> ({completion.activity.category})
                          </p>
                          {completion.description && (
                            <p className="text-xs text-gray-600 mt-1 italic">
                              "{completion.description}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {completion.hasPhotos && (
                            <span className="text-xs bg-green-100 text-green-800 font-semibold px-2.5 py-1 rounded-full">
                              📸 {completion.photoCount} photo(s) submitted
                            </span>
                          )}
                          <span className="text-sm font-extrabold text-primary-700 bg-primary-100 px-3 py-1 rounded-lg">
                            {completion.creditHours} hrs verified
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No volunteer completions have been submitted for this activity yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {showAllocateModal && (
        <AllocateModal
          donationId={id}
          currentAllocated={donation.allocatedTo || []}
          onClose={() => setShowAllocateModal(false)}
          onSuccess={() => {
            setShowAllocateModal(false)
            reload()
            reloadImpact()
          }}
        />
      )}
    </>
  )
}
