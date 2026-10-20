import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, DollarSign, Sparkles, Users, Clock } from 'lucide-react'
import { donationsApi } from '../../api/donations'
import { aiApi } from '../../api/ai'
import { Alert, Button, Card, ErrorState, PageHeader, Spinner, StatusBadge, TextField } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime } from '../../lib/format'

export default function DonationDetail() {
  const { id } = useParams()
  const { data: donation, error, loading, reload } = useAsync((signal) => donationsApi.get(id, { signal }), [id])
  const { data: impact, loading: impactLoading, reload: reloadImpact } = useAsync(
    (signal) => donationsApi.getImpact(id, { signal }),
    [id]
  )

  const [generatingReport, setGeneratingReport] = useState(false)
  const [generatedReport, setGeneratedReport] = useState(null)
  const [reportError, setReportError] = useState(null)

  const back = (
    <Button as={Link} to="/admin/donations" variant="secondary" size="sm">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      All donations
    </Button>
  )

  const generateImpactReport = async () => {
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
        <Spinner className="w-8 h-8" label="Loading donation…" />
      </div>
    )
  }
  if (error) {
    return (
      <>
        <PageHeader title="Donation" actions={back} />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    )
  }

  return (
    <>
      <PageHeader title={`Donation #${id.slice(-6)}`} actions={back} />

      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">${donation.amount}</h2>
                <p className="text-sm text-gray-500">Donated {formatDateTime(donation.createdAt)}</p>
              </div>
            </div>
            <StatusBadge status={donation.status} />
          </div>
          {donation.activity && (
            <p className="text-sm text-gray-600">
              Linked to:{' '}
              <Link to={`/admin/activities/${donation.activity.id}`} className="text-primary-600 hover:underline">
                {donation.activity.title}
              </Link>
            </p>
          )}
          {donation.note && <p className="text-sm text-gray-600 mt-2">Note: {donation.note}</p>}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Impact</h2>
            {!impactLoading && impact && (
              <Button onClick={generateImpactReport} loading={generatingReport} variant="secondary" size="sm">
                {!generatingReport && <Sparkles className="w-4 h-4" aria-hidden="true" />}
                Generate AI Report
              </Button>
            )}
          </div>

          {impactLoading && !impact ? (
            <div className="py-8 flex justify-center text-primary-600">
              <Spinner className="w-6 h-6" label="Loading impact data…" />
            </div>
          ) : impact ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-primary-600" />
                    <span className="text-sm text-gray-600">Volunteers</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{impact.totalCompletions}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-primary-600" />
                    <span className="text-sm text-gray-600">Hours</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{impact.totalHours.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-primary-600" />
                    <span className="text-sm text-gray-600">Activities</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{impact.activities.length}</p>
                </div>
              </div>

              {generatedReport && (
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                  <h3 className="font-semibold text-gray-900 mb-2">AI-Generated Impact Report</h3>
                  <p className="text-gray-700 whitespace-pre-line">{generatedReport}</p>
                </div>
              )}

              {reportError && <Alert tone="error">{reportError.message}</Alert>}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Recent Completions</h3>
                <div className="space-y-2">
                  {impact.completions.slice(0, 5).map((completion) => (
                    <div key={completion.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                      <div>
                        <p className="font-medium text-gray-900">{completion.volunteer.name}</p>
                        <p className="text-gray-600">{completion.activity.title}</p>
                      </div>
                      <span className="text-gray-500">{completion.creditHours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No impact data available yet.</p>
          )}
        </Card>
      </div>
    </>
  )
}
