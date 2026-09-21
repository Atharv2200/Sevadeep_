import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode } from 'lucide-react'
import { activitiesApi } from '../../api/activities'
import { Alert, Card, Spinner } from '../ui'
import { formatDateTime } from '../../lib/format'

const RETRY_MS = 5000
// While the server declines to issue a code (not open yet, closed, ...), ask again now
// and then: the state can change without this page being reloaded.
const DECLINED_RETRY_MS = 30000
// The server will never say yes to these.
const FATAL_STATUSES = new Set([401, 403, 404])

// Shows the attendance QR for an activity. The URL, its signature and its lifetime all
// come from the server (GET /activities/:id/qr); this component only draws the URL and
// asks for the next one when the server says to (`refreshInSeconds`). It holds no
// secret and makes no security decision.
export default function QrPanel({ activityId, activity }) {
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [, setNow] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer = null

    const schedule = (ms) => {
      clearTimeout(timer)
      timer = setTimeout(load, ms)
    }

    async function load() {
      try {
        const next = await activitiesApi.getQr(activityId, { signal: controller.signal })
        if (controller.signal.aborted) return
        setQr(next)
        setError(null)
        setSecondsLeft(next.refreshInSeconds)
        schedule(next.refreshInSeconds * 1000)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err)
        if (err.status === 409) setQr(null)
        if (!FATAL_STATUSES.has(err.status)) schedule(err.status === 409 ? DECLINED_RETRY_MS : RETRY_MS)
      }
    }

    load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [activityId])

  // One-second tick for the countdown and to notice a code that has outlived its expiry.
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1))
      setNow((tick) => tick + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // If refreshing keeps failing, the last code stays on screen only while it is still valid.
  const expired = qr && error && Date.now() >= new Date(qr.expiresAt).getTime()
  const showQr = qr && !expired
  const declined = error?.status === 409

  return (
    <Card>
      <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-primary-600" aria-hidden="true" />
        Attendance QR code
      </h2>
      <p className="text-sm text-gray-600 mb-4">Volunteers scan this with their phone's camera. It changes automatically.</p>

      {showQr && (
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-white rounded-xl border border-gray-200" data-testid="qr-frame">
            <QRCodeSVG value={qr.url} size={256} level="M" title="Attendance QR code" />
          </div>
          <p className="text-sm text-gray-600" data-testid="qr-refresh">Refreshes in {secondsLeft}s</p>
          <p className="text-xs text-gray-500 text-center">Each code stops working about 5 minutes after it is shown ({formatDateTime(qr.expiresAt)}).</p>
        </div>
      )}

      {!qr && !error && (
        <div className="py-10 flex justify-center text-primary-600">
          <Spinner className="w-6 h-6" label="Getting the QR code…" />
        </div>
      )}

      {declined && (
        <Alert tone="info" title="No QR code right now">
          {error.message}
          {activity?.status === 'OPEN' && (
            <span className="block mt-1">
              Attendance runs from {formatDateTime(activity.attendance.opensAt)} to {formatDateTime(activity.attendance.closesAt)}.
            </span>
          )}
        </Alert>
      )}

      {error && !declined && (
        <Alert tone="error" title={showQr ? "Couldn't refresh the QR code" : "Couldn't get the QR code"}>
          {showQr ? 'Showing the last code while we retry.' : error.message}
        </Alert>
      )}
    </Card>
  )
}
