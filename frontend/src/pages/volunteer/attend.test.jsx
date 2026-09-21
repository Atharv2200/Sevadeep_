import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { activity, attendanceRecord, emptyPage, listBody } from '../../test/fixtures'
import { fix, positionFails, positionFound, removeGeolocation, stubGeolocation } from '../../test/geolocation'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

const location = () => screen.getByTestId('location').textContent
const signedIn = { 'GET /api/auth/me': { body: { user: volunteerUser } } }
const open = { ...activity(1), attendance: { opensAt: '2020-01-01T00:00:00Z', closesAt: '2099-01-01T00:00:00Z', isOpen: true } }
const ATTEND = '/attend/act1?t=1234.tokenvalue'

const base = (over = {}) => ({
  ...signedIn,
  'GET /api/activities/act1': { body: { activity: open } },
  'GET /api/attendance': emptyPage,
  ...over,
})
const checkInButton = () => screen.findByRole('button', { name: /^check in$/i })
const apiError = (status, code, message) => ({ status, body: { code, message } })

afterEach(() => {
  vi.stubGlobal('isSecureContext', true)
})

describe('QR redirect through sign-in', () => {
  it('sends a signed-out visitor to sign in and brings them back to the attendance page with the token', async () => {
    let signedInNow = false
    const mock = mockApi({
      'GET /api/auth/me': () => (signedInNow ? { body: { user: volunteerUser } } : { status: 401, body: { message: 'x', code: 'UNAUTHENTICATED' } }),
      'POST /api/auth/login': () => {
        signedInNow = true
        return { body: { user: volunteerUser } }
      },
      'GET /api/activities/act1': { body: { activity: open } },
      'GET /api/attendance': emptyPage,
      'POST /api/activities/act1/attendance': { status: 201, body: { attendance: attendanceRecord(1) } },
    })
    positionFound()
    renderApp(ATTEND)

    await waitFor(() => expect(location()).toBe('/login?next=%2Fattend%2Fact1%3Ft%3D1234.tokenvalue'))
    await userEvent.type(await screen.findByLabelText('Email'), 'asha@example.org')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-battery')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(location()).toBe(ATTEND))
    await userEvent.click(await checkInButton())
    await waitFor(() => expect(mock.callsTo('POST /api/activities/act1/attendance')).toHaveLength(1))
    expect(mock.callsTo('POST /api/activities/act1/attendance')[0].body.token).toBe('1234.tokenvalue')
  })

  it('does not follow an unsafe next after sign-in', async () => {
    mockApi({
      'GET /api/auth/me': { status: 401, body: { message: 'x', code: 'UNAUTHENTICATED' } },
      'POST /api/auth/login': { body: { user: volunteerUser } },
    })
    renderApp(`/login?next=${encodeURIComponent('//evil.example/attend/act1?t=x')}`)
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(location()).toContain('/login')
  })

  it('shows access denied to an admin without calling any attendance API', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderApp(ATTEND)
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/activities/act1')).toHaveLength(0)
    expect(mock.callsTo('POST /api/activities/act1/attendance')).toHaveLength(0)
  })
})

describe('Attend page: before checking in', () => {
  it('explains how to check in when there is no QR token, with no scanner and no button', async () => {
    mockApi(base())
    const geo = positionFound()
    renderApp('/attend/act1')
    expect(await screen.findByText(/scan the qr code to check in/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /scan/i })).not.toBeInTheDocument()
    expect(geo).not.toHaveBeenCalled()
  })

  it('shows the activity and asks for location only when the volunteer taps Check in', async () => {
    mockApi(base())
    const geo = positionFound()
    renderApp(ATTEND)
    expect(await screen.findByRole('heading', { name: 'Activity 1', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Venue 1')).toBeInTheDocument()
    expect(geo).not.toHaveBeenCalled()
    await checkInButton()
    expect(geo).not.toHaveBeenCalled()
  })

  it('checks in with the token and the position only, then shows the result', async () => {
    const mock = mockApi(
      base({ 'POST /api/activities/act1/attendance': { status: 201, body: { attendance: attendanceRecord(1) } } })
    )
    const geo = positionFound(fix(18.52, 73.85, 14))
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())

    expect(await screen.findByRole('heading', { name: "You're checked in" })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(/thank you for volunteering/i)
    expect(geo.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 })
    const [call] = mock.callsTo('POST /api/activities/act1/attendance')
    expect(call.body).toEqual({ token: '1234.tokenvalue', latitude: 18.52, longitude: 73.85, accuracy: 14 })
    expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^check in$/i })).not.toBeInTheDocument()
  })

  it('never shows the volunteer a distance, accuracy or coordinates', async () => {
    mockApi(base({ 'POST /api/activities/act1/attendance': { status: 201, body: { attendance: attendanceRecord(1) } } }))
    positionFound(fix(18.5204, 73.8567, 14))
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    await screen.findByRole('button', { name: /check out/i })
    const text = screen.getByRole('main').textContent
    expect(text).not.toMatch(/distance|accuracy|18\.52|73\.85|flag/i)
  })

  it('warns when attendance is not open yet but leaves the decision to the server', async () => {
    mockApi(base({ 'GET /api/activities/act1': { body: { activity: { ...open, attendance: { opensAt: '2099-01-01T08:30:00Z', closesAt: '2099-01-01T12:30:00Z', isOpen: false } } } } }))
    renderApp(ATTEND)
    expect(await screen.findByText(/attendance is not open right now/i)).toBeInTheDocument()
    expect(await checkInButton()).toBeEnabled()
  })

  it.each([
    ['CLOSED', /this activity is closed/i],
    ['CANCELLED', /this activity has been cancelled/i],
  ])('offers no check-in for a %s activity', async (status, text) => {
    mockApi(base({ 'GET /api/activities/act1': { body: { activity: { ...open, status } } } }))
    renderApp(ATTEND)
    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument()
  })
})

describe('Attend page: location permission states', () => {
  const cases = [
    ['permission denied', () => positionFails(1), /allow location/i],
    ['position unavailable', () => positionFails(2), /couldn't work out where you are/i],
    ['timeout', () => positionFails(3), /took too long/i],
    ['no geolocation support', () => removeGeolocation(), /can't share your location/i],
  ]
  it.each(cases)('shows a clear message for %s and sends nothing', async (label, arrange, message) => {
    const mock = mockApi(base())
    arrange()
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/couldn't get your location/i)
    expect(alert).toHaveTextContent(message)
    expect(mock.callsTo('POST /api/activities/act1/attendance')).toHaveLength(0)
  })

  it('explains an insecure page', async () => {
    const mock = mockApi(base())
    const geo = positionFound()
    vi.stubGlobal('isSecureContext', false)
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(/secure \(https\)/i)
    expect(geo).not.toHaveBeenCalled()
    expect(mock.callsTo('POST /api/activities/act1/attendance')).toHaveLength(0)
  })

  it('lets the volunteer try again once permission is granted', async () => {
    const mock = mockApi(base({ 'POST /api/activities/act1/attendance': { status: 201, body: { attendance: attendanceRecord(1) } } }))
    positionFails(1)
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    await screen.findByRole('alert')

    positionFound()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('button', { name: /check out/i })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mock.callsTo('POST /api/activities/act1/attendance')).toHaveLength(1)
  })

  it('shows progress while locating and while submitting', async () => {
    let release
    let respond
    mockApi(
      base({
        'POST /api/activities/act1/attendance': () => new Promise((resolve) => { respond = () => resolve({ status: 201, body: { attendance: attendanceRecord(1) } }) }),
      })
    )
    stubGeolocation((ok) => { release = () => ok(fix()) })
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    expect(await screen.findByText(/finding your location/i)).toBeInTheDocument()
    release()
    expect(await screen.findByText(/recording your attendance/i)).toBeInTheDocument()
    respond()
    expect(await screen.findByRole('button', { name: /check out/i })).toBeInTheDocument()
    expect(screen.queryByText(/recording your attendance/i)).not.toBeInTheDocument()
  })
})

describe('Attend page: server decisions are shown, not second-guessed', () => {
  const tryCheckIn = async (response) => {
    mockApi(base({ 'POST /api/activities/act1/attendance': response }))
    positionFound()
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    return screen.findByRole('alert')
  }

  it.each([
    ['OUT_OF_RADIUS', 422, 'You do not appear to be at the venue.'],
    ['POOR_LOCATION_ACCURACY', 422, "Your device's location is not accurate enough. Move to an open area and try again."],
    ['RATE_LIMITED', 429, 'Too many requests, please try again later'],
  ])('%s: shows the server message and allows another try', async (code, status, message) => {
    const alert = await tryCheckIn(apiError(status, code, message))
    expect(alert).toHaveTextContent(message)
    expect(alert).toHaveTextContent(/attendance was not recorded/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled()
  })

  it.each([
    ['QR_EXPIRED', 'This QR code has expired. Scan the code shown at the venue again.'],
    ['INVALID_QR', 'This QR code is not valid. Scan the code shown at the venue.'],
  ])('%s: tells them to scan again and does not offer a pointless retry', async (code, message) => {
    const alert = await tryCheckIn(apiError(403, code, message))
    expect(alert).toHaveTextContent(message)
    expect(alert).toHaveTextContent(/phone camera/i)
    expect(screen.getByRole('button', { name: /check in/i })).toBeDisabled()
  })

  it.each([
    ['ATTENDANCE_WINDOW_CLOSED', 'Attendance is not open for this activity right now'],
    ['ACTIVITY_CLOSED', 'This activity is closed'],
    ['ACTIVITY_CANCELLED', 'This activity has been cancelled'],
  ])('%s: shows the message and stops offering a retry', async (code, message) => {
    const alert = await tryCheckIn(apiError(409, code, message))
    expect(alert).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: /check in/i })).toBeDisabled()
  })

  it('shows a network failure and allows another try', async () => {
    mockApi(base({ 'POST /api/activities/act1/attendance': () => { throw new TypeError('Failed to fetch') } }))
    positionFound()
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled()
  })

  it('shows what the server has when the volunteer was already checked in', async () => {
    let recorded = false
    mockApi(
      base({
        'GET /api/attendance': () => (recorded ? listBody([attendanceRecord(1)], 1, 1, 1) : emptyPage),
        'POST /api/activities/act1/attendance': () => {
          recorded = true
          return apiError(409, 'ALREADY_CHECKED_IN', 'You have already checked in to this activity')
        },
      })
    )
    positionFound()
    renderApp(ATTEND)
    await userEvent.click(await checkInButton())
    expect(await screen.findByRole('button', { name: /check out/i })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/already checked in/i)
  })

  it('does not start a second request on a double tap', async () => {
    const mock = mockApi(base({ 'POST /api/activities/act1/attendance': { status: 201, body: { attendance: attendanceRecord(1) } } }))
    const geo = positionFound()
    renderApp(ATTEND)
    await userEvent.dblClick(await checkInButton())
    await screen.findByRole('button', { name: /check out/i })
    expect(geo).toHaveBeenCalledTimes(1)
    expect(mock.callsTo('POST /api/activities/act1/attendance')).toHaveLength(1)
  })

  it('disables the button while a request is in flight', async () => {
    let release
    mockApi(base())
    stubGeolocation((ok) => { release = () => ok(fix()) })
    renderApp(ATTEND)
    const button = await checkInButton()
    await userEvent.click(button)
    expect(await screen.findByRole('button', { name: /check in/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /check in/i })).toHaveAttribute('aria-busy', 'true')
    release && release()
  })
})

describe('Attend page: checking out', () => {
  const checkedIn = attendanceRecord(1)
  const withRecord = (over = {}) => base({ 'GET /api/attendance': listBody([checkedIn], 1, 1, 1), ...over })

  it('offers check-out to someone already checked in, with no QR needed', async () => {
    mockApi(withRecord())
    renderApp('/attend/act1')
    expect(await screen.findByText("You're checked in", { selector: 'h2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument()
    expect(screen.queryByText(/scan the qr code/i)).not.toBeInTheDocument()
  })

  it('checks out with the position only', async () => {
    const done = { ...checkedIn, checkedOutAt: '2031-05-01T11:30:00.000Z', durationMinutes: 145 }
    const mock = mockApi(withRecord({ 'POST /api/activities/act1/attendance/check-out': { body: { attendance: done } } }))
    positionFound(fix(18.5, 73.8, 9))
    renderApp('/attend/act1')
    await userEvent.click(await screen.findByRole('button', { name: /check out/i }))

    expect(await screen.findByText('Attendance complete')).toBeInTheDocument()
    expect(screen.getByText("You're checked out")).toBeInTheDocument()
    expect(screen.getByText('145 minutes')).toBeInTheDocument()
    expect(mock.callsTo('POST /api/activities/act1/attendance/check-out')[0].body).toEqual({ latitude: 18.5, longitude: 73.8, accuracy: 9 })
    expect(screen.queryByRole('button', { name: /check out/i })).not.toBeInTheDocument()
  })

  it('shows a completed attendance without any action', async () => {
    mockApi(base({ 'GET /api/attendance': listBody([{ ...checkedIn, checkedOutAt: '2031-05-01T11:30:00.000Z', durationMinutes: 145 }], 1, 1, 1) }))
    renderApp('/attend/act1')
    expect(await screen.findByText('Attendance complete')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the location and server messages when check-out fails', async () => {
    mockApi(withRecord({ 'POST /api/activities/act1/attendance/check-out': apiError(422, 'OUT_OF_RADIUS', 'You do not appear to be at the venue.') }))
    positionFound()
    renderApp('/attend/act1')
    await userEvent.click(await screen.findByRole('button', { name: /check out/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not appear to be at the venue.')
    expect(screen.getByRole('button', { name: /try again|check out/i })).toBeEnabled()

    positionFails(1)
    await userEvent.click(screen.getByRole('button', { name: /try again|check out/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/couldn't get your location/i))
  })

  it('handles a check-out that was already recorded', async () => {
    let out = false
    mockApi(
      withRecord({
        'GET /api/attendance': () => listBody([out ? { ...checkedIn, checkedOutAt: '2031-05-01T11:30:00.000Z', durationMinutes: 145 } : checkedIn], 1, 1, 1),
        'POST /api/activities/act1/attendance/check-out': () => {
          out = true
          return apiError(409, 'ALREADY_CHECKED_OUT', 'You have already checked out of this activity')
        },
      })
    )
    positionFound()
    renderApp('/attend/act1')
    await userEvent.click(await screen.findByRole('button', { name: /check out/i }))
    expect(await screen.findByText('Attendance complete')).toBeInTheDocument()
  })

  it('does not offer check-out once the activity is cancelled', async () => {
    mockApi(withRecord({ 'GET /api/activities/act1': { body: { activity: { ...open, status: 'CANCELLED' } } } }))
    renderApp('/attend/act1')
    await screen.findByText("You're checked in", { selector: 'h2' })
    expect(screen.queryByRole('button', { name: /check out/i })).not.toBeInTheDocument()
  })
})

describe('Attend page: loading and load errors', () => {
  it('shows not-found without a retry', async () => {
    mockApi(base({ 'GET /api/activities/act1': apiError(404, 'NOT_FOUND', 'Activity not found') }))
    renderApp(ATTEND)
    expect(await screen.findByText('Activity not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('shows a server error with a retry that reloads', async () => {
    let calls = 0
    mockApi(base({ 'GET /api/activities/act1': () => (++calls === 1 ? apiError(500, undefined, 'Boom') : { body: { activity: open } }) }))
    renderApp(ATTEND)
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await checkInButton()).toBeInTheDocument()
  })

  it('asks the history endpoint only for this activity', async () => {
    const mock = mockApi(base())
    renderApp(ATTEND)
    await checkInButton()
    expect(mock.callsTo('GET /api/attendance')[0].query).toEqual({ activity: 'act1', limit: '1' })
  })
})

describe('volunteer History page', () => {
  const rows = [
    attendanceRecord(1, { checkedOutAt: '2031-05-01T11:30:00.000Z', durationMinutes: 145 }),
    attendanceRecord(2),
  ]

  it('is in the volunteer navigation', async () => {
    mockApi({ ...signedIn, 'GET /api/attendance': listBody(rows, 2, 1, 20) })
    renderApp('/volunteer/history')
    const nav = within(await screen.findByRole('navigation', { name: /volunteer navigation/i }))
    expect(nav.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/volunteer/history')
  })

  it('lists the volunteer\'s attendance with times and duration only', async () => {
    const mock = mockApi({ ...signedIn, 'GET /api/attendance': listBody(rows, 2, 1, 20) })
    renderApp('/volunteer/history')
    expect(await screen.findByRole('link', { name: 'Activity 1' })).toHaveAttribute('href', '/volunteer/activities/act1')
    expect(screen.getByText('145 min')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Not checked out' })).toHaveAttribute('href', '/attend/act2')
    expect(mock.callsTo('GET /api/attendance')[0].query).toEqual({ page: '1', limit: '20' })
    expect(screen.getByRole('main').textContent).not.toMatch(/distance|accuracy|latitude|flag/i)
  })

  it('shows an empty state', async () => {
    mockApi({ ...signedIn, 'GET /api/attendance': listBody([], 0, 1, 20) })
    renderApp('/volunteer/history')
    expect(await screen.findByText('No attendance yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse activities/i })).toHaveAttribute('href', '/volunteer/activities')
  })

  it('pages through the history', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/attendance': (req) => (req.query.page === '2' ? listBody([attendanceRecord(21)], 21, 2, 20) : listBody(Array.from({ length: 20 }, (_, i) => attendanceRecord(i + 1)), 21, 1, 20)),
    })
    renderApp('/volunteer/history')
    await screen.findByRole('link', { name: 'Activity 1' })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('link', { name: 'Activity 21' })).toBeInTheDocument()
    expect(location()).toBe('/volunteer/history?page=2')
    expect(mock.callsTo('GET /api/attendance').at(-1).query.page).toBe('2')
  })

  it('shows API errors with a retry', async () => {
    let calls = 0
    mockApi({ ...signedIn, 'GET /api/attendance': () => (++calls === 1 ? apiError(500, undefined, 'Boom') : listBody(rows, 2, 1, 20)) })
    renderApp('/volunteer/history')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('link', { name: 'Activity 1' })).toBeInTheDocument()
  })

  it('is not available to admins', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderApp('/volunteer/history')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/attendance')).toHaveLength(0)
  })
})
