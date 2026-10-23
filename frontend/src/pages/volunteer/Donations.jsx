import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, DollarSign, Sparkles, Users, Clock, ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { donationsApi } from '../../api/donations'
import { aiApi } from '../../api/ai'
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useListParams } from '../../hooks/useListParams'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 10

function DonationImpactModal({ donationId, onClose }) {
  const { data: impact, loading: impactLoading, error: impactError } = useAsync(
    (signal) => donationsApi.getImpact(donationId, { signal }),
    [donationId]
  )

  const [generatingReport, setGeneratingReport] = useState(false)
  const [generatedReport, setGeneratedReport] = useState(null)
  const [reportError, setReportError] = useState(null)

  const handleGenerateReport = async () => {
    if (!impact) return
    setGeneratingReport(true)
    setReportError(null)
    try {
      const res = await aiApi.generateImpactReport(impact)
      setGeneratedReport(res.report)
    } catch (err) {
      setReportError(err)
    } finally {
      setGeneratingReport(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Contribution Impact Tracker</h3>
              <p className="text-xs text-gray-500">Ref #{donationId.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {impactLoading && (
          <div className="py-12 flex justify-center text-primary-600">
            <Spinner className="w-8 h-8" label="Fetching live impact data…" />
          </div>
        )}

        {impactError && <Alert tone="error">{impactError.message}</Alert>}

        {impact && (
          <div className="space-y-6">
            {/* Impact Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                <Users className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <span className="text-2xl font-bold text-gray-900 block">{impact.totalCompletions}</span>
                <span className="text-xs text-gray-600 font-medium">Volunteers Supported</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-2xl font-bold text-gray-900 block">{impact.totalHours}h</span>
                <span className="text-xs text-gray-600 font-medium">Hours Enabled</span>
              </div>
              <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <span className="text-2xl font-bold text-gray-900 block">{impact.activities.length}</span>
                <span className="text-xs text-gray-600 font-medium">Causes Funded</span>
              </div>
            </div>

            {/* AI Report Section */}
            <div className="bg-gradient-to-br from-primary-50 to-orange-50 p-5 rounded-xl border border-primary-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  Personalized AI Impact Letter
                </h4>
                {!generatedReport && (
                  <Button
                    onClick={handleGenerateReport}
                    loading={generatingReport}
                    variant="primary"
                    size="sm"
                  >
                    {!generatingReport && <Sparkles className="w-3.5 h-3.5 mr-1" />}
                    Generate Letter
                  </Button>
                )}
              </div>

              {generatedReport ? (
                <div className="bg-white p-4 rounded-lg border border-primary-100 text-sm text-gray-800 leading-relaxed whitespace-pre-line shadow-sm">
                  {generatedReport}
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  Click above to generate a custom impact letter detailing exactly how your contribution made a difference in the community.
                </p>
              )}

              {reportError && (
                <p className="text-xs text-red-600 mt-2">Could not generate AI report: {reportError.message}</p>
              )}
            </div>

            {/* Verified Completions List */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3 text-sm">Verified Volunteer Proofs & Field Hours</h4>
              {impact.completions.length > 0 ? (
                <div className="space-y-2.5">
                  {impact.completions.map((comp) => (
                    <div
                      key={comp.id}
                      className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{comp.volunteer.name}</p>
                        <p className="text-xs text-gray-500">{comp.activity.title}</p>
                        {comp.description && (
                          <p className="text-xs text-gray-600 mt-1 italic">"{comp.description}"</p>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary-100 text-primary-800">
                        {comp.creditHours} hrs verified
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Volunteers are currently deployed. Verification proofs will appear soon.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-right">
          <Button onClick={onClose} variant="secondary" size="sm">
            Close Tracker
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function VolunteerDonations() {
  const { page, update } = useListParams()
  const { data, error, loading, reload } = useAsync(
    (signal) => donationsApi.list({ page, limit: PAGE_SIZE }, { signal }),
    [page]
  )

  const [activeModalId, setActiveModalId] = useState(null)

  return (
    <>
      <PageHeader
        title="My Contributions"
        description="Track your grassroots donations, allocated causes, and real-time volunteer impact"
        actions={
          <Button as={Link} to="/donate" variant="primary" size="sm">
            <Heart className="w-4 h-4 mr-1.5 fill-white" />
            Make a Donation
          </Button>
        }
      />

      {loading && !data && (
        <div className="py-16 flex justify-center text-primary-600">
          <Spinner className="w-8 h-8" label="Loading your contributions…" />
        </div>
      )}

      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.items.length === 0 && (
        <Card>
          <EmptyState
            icon={Heart}
            title="No contributions yet"
            description="You have not made any donations yet. Every contribution directly funds verified on-the-ground volunteer activities."
            action={
              <Button as={Link} to="/donate" variant="primary">
                Make Your First Contribution
              </Button>
            }
          />
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className={`space-y-4 ${loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
          {data.items.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-gray-900">₹{item.amount.toLocaleString()}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Contributed on {formatDateTime(item.createdAt)}</p>
                </div>
                <Button
                  onClick={() => setActiveModalId(item.id)}
                  variant="primary"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  View Impact & AI Report
                </Button>
              </div>

              <div className="pt-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-gray-600">
                <div>
                  <span className="text-gray-500">Designated Initiative: </span>
                  <span className="font-semibold text-gray-800">
                    {item.activity ? item.activity.title : 'General Grassroots Impact Fund'}
                  </span>
                </div>
                {item.note && (
                  <div className="italic text-xs text-gray-500 max-w-sm truncate">
                    "{item.note}"
                  </div>
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

      {activeModalId && (
        <DonationImpactModal
          donationId={activeModalId}
          onClose={() => setActiveModalId(null)}
        />
      )}
    </>
  )
}
