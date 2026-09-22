import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { activity, emptyPage, listBody } from '../../test/fixtures'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

const location = () => screen.getByTestId('location').textContent
const signedIn = { 'GET /api/auth/me': { body: { user: volunteerUser } } }

describe('volunteer Activities page', () => {
  it('lists the activities the server returns, each linking to its detail page', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/activities': listBody([activity(1, { title: 'Winter clothes drive', category: 'CLOTHES' }), activity(2, { attendance: { ...activity().attendance, isOpen: true } })], 2),
    })
    renderApp('/volunteer/activities')

    const link = await screen.findByRole('link', { name: 'Winter clothes drive' })
    expect(link).toHaveAttribute('href', '/volunteer/activities/act1')
    expect(within(screen.getAllByRole('article')[0]).getByText('Clothes distribution')).toBeInTheDocument()
    expect(screen.getByText('Venue 2')).toBeInTheDocument()
    expect(screen.getAllByText(/attendance is open now/i)).toHaveLength(1)
    expect(mock.callsTo('GET /api/activities')[0].query).toEqual({ page: '1', limit: '12' })
  })

  it('never asks the API for a status, so it cannot request drafts', async () => {
    const mock = mockApi({ ...signedIn, 'GET /api/activities': listBody([activity(1)]) })
    renderApp('/volunteer/activities?status=DRAFT&category=FOOD')
    await screen.findByText('Activity 1')
    expect(mock.callsTo('GET /api/activities').every((call) => !('status' in call.query))).toBe(true)
  })

  it('shows an empty state when nothing is open, and a different one when a search finds nothing', async () => {
    mockApi({ ...signedIn, 'GET /api/activities': listBody([], 0) })
    const { unmount } = renderApp('/volunteer/activities')
    expect(await screen.findByText(/no upcoming activities right now/i)).toBeInTheDocument()
    unmount()

    mockApi({ ...signedIn, 'GET /api/activities': listBody([], 0) })
    renderApp('/volunteer/activities?search=zzz')
    expect(await screen.findByText(/no activities match your search/i)).toBeInTheDocument()
  })

  it('shows the API error with a retry that reloads', async () => {
    let calls = 0
    mockApi({
      ...signedIn,
      'GET /api/activities': () => (++calls === 1 ? { status: 500, body: { message: 'Boom' } } : listBody([activity(1)])),
    })
    renderApp('/volunteer/activities')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Activity 1')).toBeInTheDocument()
  })

  it('searches (debounced) and filters by category, reflected in the URL', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/activities': (req) =>
        req.query.category === 'HEALTH' ? listBody([activity(5, { title: 'Health camp', category: 'HEALTH' })]) : req.query.search ? listBody([activity(7, { title: 'Match found' })]) : listBody([activity(1)]),
    })
    renderApp('/volunteer/activities')
    await screen.findByText('Activity 1')

    await userEvent.type(screen.getByLabelText('Search activities'), 'match')
    expect(await screen.findByText('Match found')).toBeInTheDocument()
    expect(location()).toBe('/volunteer/activities?search=match')
    expect(mock.callsTo('GET /api/activities').filter((call) => call.query.search)).toHaveLength(1)

    await userEvent.clear(screen.getByLabelText('Search activities'))
    await waitFor(() => expect(location()).toBe('/volunteer/activities'))
    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), 'HEALTH')
    expect(await screen.findByRole('link', { name: 'Health camp' })).toBeInTheDocument()
    expect(location()).toBe('/volunteer/activities?category=HEALTH')
  })

  it('pages through results', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/activities': (req) => (req.query.page === '2' ? listBody([activity(13)], 13, 2) : listBody(Array.from({ length: 12 }, (_, i) => activity(i + 1)), 13, 1)),
    })
    renderApp('/volunteer/activities')
    await screen.findByText('Activity 1')
    expect(screen.getByText(/showing 1–12 of 13/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Activity 13')).toBeInTheDocument()
    expect(location()).toBe('/volunteer/activities?page=2')
    expect(mock.callsTo('GET /api/activities').at(-1).query.page).toBe('2')
  })

  it('is not available to admins', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderApp('/volunteer/activities')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/activities')).toHaveLength(0)
  })
})

describe('volunteer Activity detail page', () => {
  // No attendance record and no contribution by default, so the contribution
  // section (loaded on its own) simply has nothing to show.
  const open = (overrides) =>
    mockApi({
      ...signedIn,
      'GET /api/activities/act1': { body: { activity: activity(1, overrides) } },
      'GET /api/attendance': emptyPage,
      'GET /api/contributions': emptyPage,
    })

  it('shows the details, instructions and the server-computed attendance window', async () => {
    open({ title: 'Food drive', instructions: 'Bring your ID.\nWear closed shoes.' })
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByRole('heading', { name: 'Food drive', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Venue 1')).toBeInTheDocument()
    expect(screen.getByText('12 Temple Road')).toBeInTheDocument()
    expect(screen.getByText('Description of activity 1.')).toBeInTheDocument()
    expect(screen.getByText(/bring your id\./i)).toBeInTheDocument()
    expect(screen.getByText('100 m from the venue')).toBeInTheDocument()
    expect(screen.getByText('Attendance window')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all activities/i })).toHaveAttribute('href', '/volunteer/activities')
  })

  it('says when attendance is open now, not open yet, or closed', async () => {
    const window = (isOpen, opensAt, closesAt) => ({ opensAt, closesAt, isOpen })
    open({ attendance: window(true, '2020-01-01T00:00:00Z', '2099-01-01T00:00:00Z') })
    const first = renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Attendance is open now')).toBeInTheDocument()
    first.unmount()

    open({ attendance: window(false, '2099-01-01T08:30:00Z', '2099-01-01T12:30:00Z') })
    const second = renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Attendance is not open yet')).toBeInTheDocument()
    second.unmount()

    open({ attendance: window(false, '2020-01-01T08:30:00Z', '2020-01-01T12:30:00Z') })
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Attendance is closed')).toBeInTheDocument()
  })

  it('explains cancelled and closed activities', async () => {
    open({ status: 'CANCELLED' })
    const first = renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('This activity has been cancelled')).toBeInTheDocument()
    first.unmount()

    open({ status: 'CLOSED' })
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('This activity is closed')).toBeInTheDocument()
  })

  it('shows a not-found message, without a retry, for an unknown or draft activity', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { status: 404, body: { message: 'Activity not found', code: 'NOT_FOUND' } } })
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Activity not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all activities/i })).toBeInTheDocument()
  })

  it('shows a retry for a server error', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { status: 500, body: { message: 'Boom' } } })
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('links to the attendance page but has no check-in control of its own', async () => {
    open({ attendance: { opensAt: '2020-01-01T00:00:00Z', closesAt: '2099-01-01T00:00:00Z', isOpen: true } })
    renderApp('/volunteer/activities/act1')
    await screen.findByText('Attendance is open now')
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('link', { name: /open attendance/i })).toHaveAttribute('href', '/attend/act1')
    expect(main.queryByRole('button')).not.toBeInTheDocument()
  })
})
