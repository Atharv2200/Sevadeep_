import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { activity, adminActivity, listBody } from '../../test/fixtures'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'
import { toLocalInput } from '../../lib/format'

const location = () => screen.getByTestId('location').textContent
const signedIn = { 'GET /api/auth/me': { body: { user: adminUser } } }
const admin20 = (items, total) => listBody(items, total, 1, 20)

describe('admin Activities list', () => {
  it('lists every activity with its status and links to the detail page', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/activities': admin20([adminActivity(1, { status: 'DRAFT', title: 'Book fair', category: 'BOOKS' }), adminActivity(2, { status: 'CANCELLED' })], 2),
    })
    renderApp('/admin/activities')

    const link = await screen.findByRole('link', { name: 'Book fair' })
    expect(link).toHaveAttribute('href', '/admin/activities/act1')
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Draft')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Books distribution')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new activity/i })).toHaveAttribute('href', '/admin/activities/new')
    expect(mock.callsTo('GET /api/activities')[0].query).toEqual({ page: '1', limit: '20' })
  })

  it('shows an empty state with a way to create the first activity', async () => {
    mockApi({ ...signedIn, 'GET /api/activities': admin20([], 0) })
    renderApp('/admin/activities')
    expect(await screen.findByText(/no activities have been created yet/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /new activity/i }).length).toBeGreaterThan(0)
  })

  it('shows a different empty state when filters match nothing', async () => {
    mockApi({ ...signedIn, 'GET /api/activities': admin20([], 0) })
    renderApp('/admin/activities?status=CLOSED')
    expect(await screen.findByText(/no activities match your search/i)).toBeInTheDocument()
  })

  it('shows the API error with a retry', async () => {
    let calls = 0
    mockApi({ ...signedIn, 'GET /api/activities': () => (++calls === 1 ? { status: 500, body: { message: 'Boom' } } : admin20([adminActivity(1)], 1)) })
    renderApp('/admin/activities')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Activity 1')).toBeInTheDocument()
  })

  it('filters by status and category and searches, all reflected in the URL', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/activities': (req) => {
        if (req.query.status === 'DRAFT') return admin20([adminActivity(4, { title: 'Only drafts', status: 'DRAFT' })], 1)
        if (req.query.category === 'HEALTH') return admin20([adminActivity(5, { title: 'Health things' })], 1)
        if (req.query.search) return admin20([adminActivity(6, { title: 'Search hit' })], 1)
        return admin20([adminActivity(1)], 1)
      },
    })
    renderApp('/admin/activities')
    await screen.findByText('Activity 1')

    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'DRAFT')
    expect(await screen.findByText('Only drafts')).toBeInTheDocument()
    expect(location()).toBe('/admin/activities?status=DRAFT')

    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), '')
    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), 'HEALTH')
    expect(await screen.findByText('Health things')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), '')
    await userEvent.type(screen.getByLabelText('Search activities'), 'hit')
    expect(await screen.findByText('Search hit')).toBeInTheDocument()
    expect(location()).toBe('/admin/activities?search=hit')
    expect(mock.callsTo('GET /api/activities').at(-1).query.search).toBe('hit')
  })

  it('restores its state from the URL and pages', async () => {
    const mock = mockApi({ ...signedIn, 'GET /api/activities': (req) => admin20(req.query.page === '2' ? [adminActivity(21)] : Array.from({ length: 20 }, (_, i) => adminActivity(i + 1)), 21) })
    renderApp('/admin/activities?status=OPEN&category=FOOD&search=abc')
    await screen.findByText('Activity 1')
    expect(mock.callsTo('GET /api/activities')[0].query).toEqual({ page: '1', limit: '20', search: 'abc', status: 'OPEN', category: 'FOOD' })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Activity 21')).toBeInTheDocument()
    expect(location()).toContain('page=2')
  })

  it('is not available to volunteers', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/admin/activities')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/activities')).toHaveLength(0)
  })
})

describe('admin Activity detail', () => {
  const open = (overrides, extra = {}) =>
    mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: adminActivity(1, overrides) } }, ...extra })

  it('shows the details, settings and creator', async () => {
    open({ status: 'DRAFT', allowedTransitions: ['OPEN', 'CANCELLED'], instructions: 'Bring ID' })
    renderApp('/admin/activities/act1')
    expect(await screen.findByRole('heading', { name: 'Activity 1', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Venue 1')).toBeInTheDocument()
    expect(screen.getByText('18.5204, 73.8567')).toBeInTheDocument()
    expect(screen.getByText('30 min before the start')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByText('Root Admin')).toBeInTheDocument()
    expect(screen.getByText('Bring ID')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/admin/activities/act1/edit')
  })

  it('offers exactly the transitions the server allows', async () => {
    open({ status: 'DRAFT', allowedTransitions: ['OPEN', 'CANCELLED'] })
    renderApp('/admin/activities/act1')
    expect(await screen.findByRole('button', { name: 'Open for volunteers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel activity' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close activity' })).not.toBeInTheDocument()
  })

  it('opens a draft without a confirmation and shows the new state', async () => {
    let status = 'DRAFT'
    const mock = mockApi({
      ...signedIn,
      'GET /api/activities/act1': () => ({ body: { activity: adminActivity(1, status === 'DRAFT' ? { status, allowedTransitions: ['OPEN', 'CANCELLED'] } : { status, allowedTransitions: ['CLOSED', 'CANCELLED'] }) } }),
      'PATCH /api/activities/act1/status': (req) => {
        status = req.body.status
        return { body: { activity: adminActivity(1, { status }) } }
      },
    })
    renderApp('/admin/activities/act1')
    await userEvent.click(await screen.findByRole('button', { name: 'Open for volunteers' }))
    expect(await screen.findByRole('button', { name: 'Close activity' })).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/activities/act1/status')[0].body).toEqual({ status: 'OPEN' })
    expect(screen.queryByRole('button', { name: 'Open for volunteers' })).not.toBeInTheDocument()
  })

  it('asks for confirmation before closing or cancelling, and can back out', async () => {
    const mock = open({ status: 'OPEN', allowedTransitions: ['CLOSED', 'CANCELLED'] }, { 'PATCH /api/activities/act1/status': { body: { activity: adminActivity(1, { status: 'CANCELLED', allowedTransitions: [] }) } } })
    renderApp('/admin/activities/act1')

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel activity' }))
    expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/activities/act1/status')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: /keep as is/i }))
    expect(screen.getByRole('button', { name: 'Close activity' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel activity' }))
    await userEvent.click(screen.getByRole('button', { name: /yes, cancel activity/i }))
    await waitFor(() => expect(mock.callsTo('PATCH /api/activities/act1/status')).toHaveLength(1))
    expect(mock.callsTo('PATCH /api/activities/act1/status')[0].body).toEqual({ status: 'CANCELLED' })
  })

  it('shows the server message when a change is refused, and refreshes the state', async () => {
    const mock = open(
      { status: 'DRAFT', allowedTransitions: ['OPEN', 'CANCELLED'] },
      { 'PATCH /api/activities/act1/status': { status: 409, body: { message: 'An activity that has already ended cannot be opened', code: 'ACTIVITY_ALREADY_ENDED' } } }
    )
    renderApp('/admin/activities/act1')
    await userEvent.click(await screen.findByRole('button', { name: 'Open for volunteers' }))
    expect(await screen.findByText(/already ended cannot be opened/i)).toBeInTheDocument()
    await waitFor(() => expect(mock.callsTo('GET /api/activities/act1').length).toBeGreaterThan(1))
  })

  it('offers no actions and no Edit for a terminal activity', async () => {
    open({ status: 'CLOSED', allowedTransitions: [] })
    renderApp('/admin/activities/act1')
    expect(await screen.findByText(/cannot be reopened/i)).toBeInTheDocument()
    const main = within(screen.getByRole('main'))
    expect(main.queryByRole('button', { name: /open|close|cancel/i })).not.toBeInTheDocument()
    expect(main.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows not-found without a retry', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { status: 404, body: { message: 'Activity not found', code: 'NOT_FOUND' } } })
    renderApp('/admin/activities/act1')
    expect(await screen.findByText('Activity not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })
})

const START = '2031-05-01T09:00'
const END = '2031-05-01T12:00'

async function fillCreateForm({ skip = [] } = {}) {
  await screen.findByLabelText(/^title/i)
  const type = async (label, value) => {
    if (!skip.includes(label)) await userEvent.type(screen.getByLabelText(label), value)
  }
  await type(/^title/i, 'Winter clothes drive')
  if (!skip.includes('category')) await userEvent.selectOptions(screen.getByLabelText(/^category/i), 'CLOTHES')
  await type(/^description/i, 'Collecting warm clothes.')
  if (!skip.includes('dates')) {
    fireEvent.change(screen.getByLabelText(/^starts/i), { target: { value: START } })
    fireEvent.change(screen.getByLabelText(/^ends/i), { target: { value: END } })
  }
  await type(/venue name/i, 'Community hall')
  await type(/^latitude/i, '18.5204')
  await type(/^longitude/i, '73.8567')
}

describe('admin Activity form: create', () => {
  it('creates an activity with API-shaped values, then opens its detail page', async () => {
    const mock = mockApi({
      ...signedIn,
      'POST /api/activities': { status: 201, body: { activity: adminActivity(9, { status: 'DRAFT', allowedTransitions: ['OPEN', 'CANCELLED'] }) } },
      'GET /api/activities/act9': { body: { activity: adminActivity(9, { title: 'Winter clothes drive', status: 'DRAFT', allowedTransitions: ['OPEN', 'CANCELLED'] }) } },
    })
    renderApp('/admin/activities/new')
    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: /create activity/i }))

    await waitFor(() => expect(location()).toBe('/admin/activities/act9'))
    expect(await screen.findByRole('heading', { name: 'Winter clothes drive', level: 1 })).toBeInTheDocument()
    expect(mock.callsTo('POST /api/activities')[0].body).toEqual({
      title: 'Winter clothes drive',
      category: 'CLOTHES',
      description: 'Collecting warm clothes.',
      startsAt: new Date(START).toISOString(),
      endsAt: new Date(END).toISOString(),
      locationName: 'Community hall',
      address: '',
      latitude: 18.5204,
      longitude: 73.8567,
      radiusMeters: 100,
      instructions: '',
      attendanceOpensMinutesBefore: 30,
      attendanceClosesMinutesAfter: 30,
    })
  })

  it('never sends server-controlled fields', async () => {
    const mock = mockApi({ ...signedIn, 'POST /api/activities': { status: 201, body: { activity: adminActivity(9) } }, 'GET /api/activities/act9': { body: { activity: adminActivity(9) } } })
    renderApp('/admin/activities/new')
    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: /create activity/i }))
    await waitFor(() => expect(mock.callsTo('POST /api/activities')).toHaveLength(1))
    const body = mock.callsTo('POST /api/activities')[0].body
    for (const field of ['status', 'createdBy', 'qrSecret', 'id', 'attendance']) expect(body).not.toHaveProperty(field)
  })

  it('flags empty required fields without calling the API', async () => {
    const mock = mockApi({ ...signedIn })
    renderApp('/admin/activities/new')
    await userEvent.click(await screen.findByRole('button', { name: /create activity/i }))
    expect(screen.getAllByText('This field is required').length).toBeGreaterThanOrEqual(7)
    expect(mock.callsTo('POST /api/activities')).toHaveLength(0)
  })

  it('shows the server validation errors next to their fields', async () => {
    mockApi({
      ...signedIn,
      'POST /api/activities': {
        status: 400,
        body: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: [
            { path: 'body.endsAt', message: 'The end must be after the start' },
            { path: 'body.latitude', message: 'Latitude must be between -90 and 90' },
          ],
        },
      },
    })
    renderApp('/admin/activities/new')
    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: /create activity/i }))
    expect(await screen.findByText('The end must be after the start')).toBeInTheDocument()
    expect(screen.getByText('Latitude must be between -90 and 90')).toBeInTheDocument()
    // Field errors are shown at the field, not repeated in a banner, and the form keeps its values.
    expect(screen.queryByText('Validation failed')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^title/i)).toHaveValue('Winter clothes drive')
    expect(screen.getByRole('button', { name: /create activity/i })).toBeEnabled()
  })

  it('shows other API errors in a banner', async () => {
    mockApi({ ...signedIn, 'POST /api/activities': { status: 500, body: { message: 'Something broke' } } })
    renderApp('/admin/activities/new')
    await fillCreateForm()
    await userEvent.click(screen.getByRole('button', { name: /create activity/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something broke')
  })

  it('is not available to volunteers', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/admin/activities/new')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
  })
})

describe('admin Activity form: edit', () => {
  const existing = adminActivity(1, { status: 'DRAFT', startsAt: new Date(2031, 4, 1, 9, 0).toISOString(), endsAt: new Date(2031, 4, 1, 12, 0).toISOString() })
  const open = (extra = {}) => mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: existing } }, ...extra })

  it('is prefilled from the activity', async () => {
    open()
    renderApp('/admin/activities/act1/edit')
    expect(await screen.findByLabelText(/^title/i)).toHaveValue('Activity 1')
    expect(screen.getByLabelText(/^category/i)).toHaveValue('FOOD')
    expect(screen.getByLabelText(/^starts/i)).toHaveValue(toLocalInput(existing.startsAt))
    expect(screen.getByLabelText(/^latitude/i)).toHaveValue(18.5204)
    expect(screen.getByLabelText(/venue name/i)).toHaveValue('Venue 1')
  })

  it('sends only the fields that changed', async () => {
    const mock = open({
      'PATCH /api/activities/act1': { body: { activity: adminActivity(1, { title: 'Renamed' }) } },
    })
    renderApp('/admin/activities/act1/edit')
    const title = await screen.findByLabelText(/^title/i)
    await userEvent.clear(title)
    await userEvent.type(title, 'Renamed')
    await userEvent.clear(screen.getByLabelText(/check-in radius/i))
    await userEvent.type(screen.getByLabelText(/check-in radius/i), '250')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mock.callsTo('PATCH /api/activities/act1')).toHaveLength(1))
    expect(mock.callsTo('PATCH /api/activities/act1')[0].body).toEqual({ title: 'Renamed', radiusMeters: 250 })
    await waitFor(() => expect(location()).toBe('/admin/activities/act1'))
  })

  it('does not call the API when nothing changed', async () => {
    const mock = open()
    renderApp('/admin/activities/act1/edit')
    await userEvent.click(await screen.findByRole('button', { name: /save changes/i }))
    expect(screen.getByText(/nothing has changed/i)).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/activities/act1')).toHaveLength(0)
  })

  it('shows a server refusal, such as a locked activity', async () => {
    open({ 'PATCH /api/activities/act1': { status: 409, body: { message: 'A closed activity can no longer be edited', code: 'ACTIVITY_LOCKED' } } })
    renderApp('/admin/activities/act1/edit')
    const title = await screen.findByLabelText(/^title/i)
    await userEvent.type(title, '!')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('can no longer be edited')
  })

  it('does not offer a form for a closed or cancelled activity', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { body: { activity: adminActivity(1, { status: 'CANCELLED', allowedTransitions: [] }) } } })
    renderApp('/admin/activities/act1/edit')
    expect(await screen.findByText(/this activity is cancelled/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('shows not-found for an unknown activity', async () => {
    mockApi({ ...signedIn, 'GET /api/activities/act1': { status: 404, body: { message: 'Activity not found', code: 'NOT_FOUND' } } })
    renderApp('/admin/activities/act1/edit')
    expect(await screen.findByText('Activity not found')).toBeInTheDocument()
  })
})
