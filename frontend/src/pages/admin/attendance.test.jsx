import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { activity, adminActivity, adminAttendance, listBody } from '../../test/fixtures'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

// The QR itself is drawn by qrcode.react; here we only care what value it is given.
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }) => <svg data-testid="qr" data-value={value} role="img" aria-label="QR" />,
}))

const signedIn = { 'GET /api/auth/me': { body: { user: adminUser } } }
const openNow = adminActivity(1, {
  status: 'OPEN',
  attendance: { opensAt: '2020-01-01T00:00:00Z', closesAt: '2099-01-01T00:00:00Z', isOpen: true },
})
const qr = (n = 1, over = {}) => ({
  url: `https://sevadeep.test/attend/act1?t=${n}.token${n}`,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  refreshInSeconds: 60,
  ...over,
})
const live = (items, total = items.length) => ({ body: { items, total } })

const routes = (over = {}) => ({
  ...signedIn,
  'GET /api/activities/act1': { body: { activity: openNow } },
  'GET /api/activities/act1/attendance': live([]),
  'GET /api/activities/act1/qr': { body: qr() },
  ...over,
})

// Real time keeps flowing (so Testing Library's waits work) while timers can be advanced.
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())
const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

describe('QR display', () => {
  it('draws the URL the server built, and nothing else', async () => {
    const mock = mockApi(routes())
    renderApp('/admin/activities/act1/attendance')
    const code = await screen.findByTestId('qr')
    expect(code).toHaveAttribute('data-value', 'https://sevadeep.test/attend/act1?t=1.token1')
    expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(1)
    expect(screen.getByTestId('qr-refresh')).toHaveTextContent('Refreshes in 60s')
    expect(screen.getByText(/stops working about 5 minutes after/i)).toBeInTheDocument()
  })

  it('counts down and fetches the next code when refreshInSeconds elapses', async () => {
    let n = 0
    const mock = mockApi(routes({ 'GET /api/activities/act1/qr': () => ({ body: qr(++n, { refreshInSeconds: n === 1 ? 45 : 60 }) }) }))
    renderApp('/admin/activities/act1/attendance')
    await screen.findByTestId('qr')
    expect(screen.getByTestId('qr-refresh')).toHaveTextContent('Refreshes in 45s')

    await advance(10000)
    expect(screen.getByTestId('qr-refresh')).toHaveTextContent('Refreshes in 35s')
    expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(1)

    await advance(35000)
    await waitFor(() => expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(2))
    await waitFor(() => expect(screen.getByTestId('qr')).toHaveAttribute('data-value', expect.stringContaining('2.token2')))
    expect(screen.getByTestId('qr-refresh')).toHaveTextContent('Refreshes in 60s')

    await advance(60000)
    await waitFor(() => expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(3))
  })

  it('keeps showing the last code while a refresh fails, and retries', async () => {
    let calls = 0
    const mock = mockApi(
      routes({
        'GET /api/activities/act1/qr': () => {
          calls += 1
          return calls === 2 ? { status: 500, body: { message: 'Boom' } } : { body: qr(calls, { refreshInSeconds: 30 }) }
        },
      })
    )
    renderApp('/admin/activities/act1/attendance')
    await screen.findByTestId('qr')

    await advance(30000)
    expect(await screen.findByText(/couldn't refresh the qr code/i)).toBeInTheDocument()
    expect(screen.getByTestId('qr')).toBeInTheDocument()

    await advance(5000)
    await waitFor(() => expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(3))
    await waitFor(() => expect(screen.queryByText(/couldn't refresh the qr code/i)).not.toBeInTheDocument())
  })

  it('removes a code that has outlived its expiry when refreshing keeps failing', async () => {
    let calls = 0
    mockApi(
      routes({
        'GET /api/activities/act1/qr': () => {
          calls += 1
          return calls === 1 ? { body: qr(1, { refreshInSeconds: 30, expiresAt: new Date(Date.now() + 40000).toISOString() }) } : { status: 500, body: { message: 'Boom' } }
        },
      })
    )
    renderApp('/admin/activities/act1/attendance')
    await screen.findByTestId('qr')
    await advance(30000)
    expect(screen.getByTestId('qr')).toBeInTheDocument()
    await advance(15000)
    await waitFor(() => expect(screen.queryByTestId('qr')).not.toBeInTheDocument())
    expect(screen.getByText(/couldn't get the qr code/i)).toBeInTheDocument()
  })

  it.each([
    ['ACTIVITY_NOT_OPEN', 'Open the activity before showing its QR code'],
    ['ATTENDANCE_WINDOW_CLOSED', 'Attendance is not open for this activity right now'],
    ['ACTIVITY_CLOSED', 'This activity is closed'],
  ])('shows why there is no QR (%s) and checks again later', async (code, message) => {
    const mock = mockApi(routes({ 'GET /api/activities/act1/qr': { status: 409, body: { code, message } } }))
    renderApp('/admin/activities/act1/attendance')
    expect(await screen.findByText('No QR code right now')).toBeInTheDocument()
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()

    await advance(30000)
    await waitFor(() => expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(2))
  })

  it('starts showing the QR when the server starts allowing it', async () => {
    let allowed = false
    mockApi(routes({ 'GET /api/activities/act1/qr': () => (allowed ? { body: qr() } : { status: 409, body: { code: 'ATTENDANCE_WINDOW_CLOSED', message: 'Not open yet' } }) }))
    renderApp('/admin/activities/act1/attendance')
    await screen.findByText('No QR code right now')
    allowed = true
    await advance(30000)
    expect(await screen.findByTestId('qr')).toBeInTheDocument()
  })

  it('stops asking after a permission or not-found answer', async () => {
    const mock = mockApi(routes({ 'GET /api/activities/act1/qr': { status: 403, body: { code: 'FORBIDDEN', message: 'No access' } } }))
    renderApp('/admin/activities/act1/attendance')
    await screen.findByText("Couldn't get the QR code")
    await advance(120000)
    expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(1)
  })

  it('stops refreshing when the admin leaves the page', async () => {
    const mock = mockApi(routes())
    const view = renderApp('/admin/activities/act1/attendance')
    await screen.findByTestId('qr')
    view.unmount()
    await advance(180000)
    expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(1)
  })

  it('has no secret or token logic: it never reads or builds a token itself', async () => {
    const mock = mockApi(routes())
    renderApp('/admin/activities/act1/attendance')
    await screen.findByTestId('qr')
    expect(mock.calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
    expect(document.body.innerHTML).not.toMatch(/qrSecret/)
  })
})

describe('Live attendance list', () => {
  const rows = [
    adminAttendance(1, { volunteer: { id: 'v1', volunteerId: 'VOL-2031-0001', name: 'Asha Rao' }, flags: ['NEAR_BOUNDARY', 'EARLY'] }),
    adminAttendance(2, { volunteer: { id: 'v2', volunteerId: 'VOL-2031-0002', name: 'Ravi Kumar' }, checkedOutAt: '2031-05-01T11:00:00.000Z', durationMinutes: 115, checkIn: { latitude: 1, longitude: 1, accuracy: 60, distanceMeters: 12.4 } }),
  ]

  it('shows who checked in with time, distance, accuracy and flags', async () => {
    mockApi(routes({ 'GET /api/activities/act1/attendance': live(rows) }))
    renderApp('/admin/activities/act1/attendance')
    expect(await screen.findByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/admin/volunteers/v1')
    expect(screen.getByText('VOL-2031-0001')).toBeInTheDocument()
    expect(screen.getByText('Checked in (2)')).toBeInTheDocument()

    const [, first, second] = screen.getAllByRole('row')
    expect(within(first).getByText('35 m')).toBeInTheDocument()
    expect(within(first).getByText('±12 m')).toBeInTheDocument()
    expect(within(first).getByText('Near boundary')).toBeInTheDocument()
    expect(within(first).getByText('Early')).toBeInTheDocument()
    expect(within(first).getByText('Not yet')).toBeInTheDocument()
    expect(within(second).getByText('115 min')).toBeInTheDocument()
    expect(within(second).getByText('±60 m')).toBeInTheDocument()
  })

  it('shows an empty state before anyone has checked in', async () => {
    mockApi(routes())
    renderApp('/admin/activities/act1/attendance')
    expect(await screen.findByText('No one has checked in yet')).toBeInTheDocument()
    expect(screen.getByText('Checked in (0)')).toBeInTheDocument()
  })

  it('says when only the latest rows are shown', async () => {
    mockApi(routes({ 'GET /api/activities/act1/attendance': live(rows, 250) }))
    renderApp('/admin/activities/act1/attendance')
    expect(await screen.findByText(/showing the latest 2 of 250/i)).toBeInTheDocument()
  })

  it('polls: new check-ins appear without a reload', async () => {
    let list = []
    const mock = mockApi(routes({ 'GET /api/activities/act1/attendance': () => live(list) }))
    renderApp('/admin/activities/act1/attendance')
    await screen.findByText('No one has checked in yet')
    expect(mock.callsTo('GET /api/activities/act1/attendance')).toHaveLength(1)

    list = [rows[0]]
    await advance(10000)
    expect(await screen.findByRole('link', { name: 'Asha Rao' })).toBeInTheDocument()
    expect(mock.callsTo('GET /api/activities/act1/attendance')).toHaveLength(2)

    list = rows
    await advance(10000)
    expect(await screen.findByRole('link', { name: 'Ravi Kumar' })).toBeInTheDocument()
  })

  it('keeps the list and warns when a refresh fails, then recovers', async () => {
    let fail = false
    mockApi(routes({ 'GET /api/activities/act1/attendance': () => (fail ? { status: 503, body: { message: 'Unavailable' } } : live(rows)) }))
    renderApp('/admin/activities/act1/attendance')
    await screen.findByRole('link', { name: 'Asha Rao' })

    fail = true
    await advance(10000)
    expect(await screen.findByText("Couldn't refresh the list")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Asha Rao' })).toBeInTheDocument()

    fail = false
    await advance(10000)
    await waitFor(() => expect(screen.queryByText("Couldn't refresh the list")).not.toBeInTheDocument())
  })

  it('stops polling and shows the error when the activity does not exist', async () => {
    const mock = mockApi(routes({ 'GET /api/activities/act1': { status: 404, body: { message: 'Activity not found', code: 'NOT_FOUND' } } }))
    renderApp('/admin/activities/act1/attendance')
    expect(await screen.findByText('Activity not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    await advance(60000)
    expect(mock.callsTo('GET /api/activities/act1')).toHaveLength(1)
  })

  it('shows a retryable error when the first load fails', async () => {
    let calls = 0
    mockApi(routes({ 'GET /api/activities/act1/attendance': () => (++calls === 1 ? { status: 500, body: { message: 'Boom' } } : live(rows)) }))
    renderApp('/admin/activities/act1/attendance')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('link', { name: 'Asha Rao' })).toBeInTheDocument()
  })

  it('stops polling when the admin leaves', async () => {
    const mock = mockApi(routes())
    const view = renderApp('/admin/activities/act1/attendance')
    await screen.findByText('No one has checked in yet')
    view.unmount()
    await advance(60000)
    expect(mock.callsTo('GET /api/activities/act1/attendance')).toHaveLength(1)
  })
})

describe('admin attendance routes and links', () => {
  it('is not available to volunteers, and calls no admin API', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/admin/activities/act1/attendance')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/activities/act1/qr')).toHaveLength(0)
    expect(mock.callsTo('GET /api/activities/act1/attendance')).toHaveLength(0)
  })

  it('sends a signed-out visitor to sign in first', async () => {
    mockApi({ 'GET /api/auth/me': { status: 401, body: { message: 'x', code: 'UNAUTHENTICATED' } } })
    renderApp('/admin/activities/act1/attendance')
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/login?next=%2Fadmin%2Factivities%2Fact1%2Fattendance'))
  })

  it.each([
    ['OPEN', 'Open attendance screen'],
    ['CLOSED', 'View attendance'],
    ['CANCELLED', 'View attendance'],
  ])('the %s activity detail links to the attendance screen (%s)', async (status, label) => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: adminActivity(1, { status, allowedTransitions: [] }) } } })
    renderApp('/admin/activities/act1')
    expect(await screen.findByRole('link', { name: label })).toHaveAttribute('href', '/admin/activities/act1/attendance')
  })

  it('a draft has no attendance screen yet', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: adminActivity(1, { status: 'DRAFT', allowedTransitions: ['OPEN', 'CANCELLED'] }) } } })
    renderApp('/admin/activities/act1')
    expect(await screen.findByText(/open the activity to start taking attendance/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /attendance/i })).not.toBeInTheDocument()
  })

  it('shows whether the location is locked', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: adminActivity(1, { locationLocked: true }) } } })
    renderApp('/admin/activities/act1')
    expect(await screen.findByText(/locked: volunteers have already checked in/i)).toBeInTheDocument()
  })
})

describe('locked location in the activity form', () => {
  it('disables the coordinates and radius once volunteers have checked in', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: adminActivity(1, { locationLocked: true }) } } })
    renderApp('/admin/activities/act1/edit')
    expect(await screen.findByText('The location is locked')).toBeInTheDocument()
    for (const label of [/^latitude/i, /^longitude/i, /check-in radius/i]) expect(screen.getByLabelText(label)).toBeDisabled()
    expect(screen.getByLabelText(/^title/i)).toBeEnabled()
    expect(screen.getByLabelText(/venue name/i)).toBeEnabled()
  })

  it('leaves them editable before that', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: adminActivity(1, { locationLocked: false }) } } })
    renderApp('/admin/activities/act1/edit')
    expect(await screen.findByLabelText(/^latitude/i)).toBeEnabled()
    expect(screen.queryByText('The location is locked')).not.toBeInTheDocument()
  })

  it('shows the server refusal if the location gets locked while editing', async () => {
    mockApi({
      ...signedIn,
      'GET /api/activities/act1': { body: { activity: adminActivity(1, { locationLocked: false }) } },
      'PATCH /api/activities/act1': { status: 409, body: { code: 'ACTIVITY_LOCATION_LOCKED', message: 'The location and radius cannot be changed once volunteers have checked in' } },
    })
    renderApp('/admin/activities/act1/edit')
    const radius = await screen.findByLabelText(/check-in radius/i)
    await userEvent.clear(radius)
    await userEvent.type(radius, '300')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be changed once volunteers have checked in/i)
  })
})

describe('admin volunteer attendance history', () => {
  const detail = { volunteer: { id: 'id1', volunteerId: 'VOL-2026-0001', name: 'Asha Rao', email: 'a@example.org', phone: '+91 98765 43210', status: 'ACTIVE', joinedAt: '2026-02-01T10:00:00.000Z', lastLoginAt: null }, stats: { activitiesAttended: 1, verifiedActivities: 0, verifiedHours: 0 } }

  it('lists the volunteer\'s attendance with the recorded evidence', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/volunteers/id1': { body: detail },
      'GET /api/attendance': listBody([adminAttendance(1, { flags: ['LATE'] })], 1, 1, 10),
    })
    renderApp('/admin/volunteers/id1')
    expect(await screen.findByText('Attendance history')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Activity 1' })).toHaveAttribute('href', '/admin/activities/act1')
    expect(screen.getByText('Late')).toBeInTheDocument()
    expect(screen.getByText('35 m')).toBeInTheDocument()
    expect(mock.callsTo('GET /api/attendance')[0].query).toEqual({ volunteer: 'id1', limit: '10' })
  })

  it('shows an empty state, and a failure here does not hide the profile', async () => {
    mockApi({ ...signedIn, 'GET /api/volunteers/id1': { body: detail }, 'GET /api/attendance': listBody([], 0, 1, 10) })
    const first = renderApp('/admin/volunteers/id1')
    expect(await screen.findByText('No attendance yet')).toBeInTheDocument()
    first.unmount()

    mockApi({ ...signedIn, 'GET /api/volunteers/id1': { body: detail }, 'GET /api/attendance': { status: 500, body: { message: 'Boom' } } })
    renderApp('/admin/volunteers/id1')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument()
  })
})
