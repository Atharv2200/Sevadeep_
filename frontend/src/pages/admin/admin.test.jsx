import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

const location = () => screen.getByTestId('location').textContent
const signedInAdmin = { 'GET /api/auth/me': { body: { user: adminUser } } }

const row = (n, overrides = {}) => ({
  id: `id${n}`,
  volunteerId: `VOL-2026-${String(n).padStart(4, '0')}`,
  name: `Volunteer ${n}`,
  email: `v${n}@example.org`,
  phone: '+91 98765 43210',
  status: 'ACTIVE',
  joinedAt: '2026-02-01T10:00:00.000Z',
  lastLoginAt: null,
  ...overrides,
})
const listBody = (items, total = items.length, page = 1) => ({ body: { items, page, limit: 20, total } })

describe('admin routes and guards', () => {
  it('shows access denied to a volunteer without calling any admin API', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/admin/volunteers')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/volunteers')).toHaveLength(0)
  })

  it('sends an anonymous visitor to sign in, remembering the destination', async () => {
    mockApi({ 'GET /api/auth/me': { status: 401, body: { message: 'x', code: 'UNAUTHENTICATED' } } })
    renderApp('/admin/volunteers?status=SUSPENDED')
    await waitFor(() => expect(location()).toBe('/login?next=%2Fadmin%2Fvolunteers%3Fstatus%3DSUSPENDED'))
  })

  it('has the admin shell and navigation', async () => {
    mockApi({ ...signedInAdmin, 'GET /api/volunteers': listBody([], 0) })
    renderApp('/admin')
    const nav = within(await screen.findByRole('navigation', { name: /admin navigation/i }))
    expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin')
    expect(nav.getByRole('link', { name: 'Volunteers' })).toHaveAttribute('href', '/admin/volunteers')
    expect(nav.getByRole('link', { name: 'Admins' })).toHaveAttribute('href', '/admin/admins')
    expect(nav.queryByRole('link', { name: /activities|attendance|verification/i })).not.toBeInTheDocument()
  })
})

describe('Overview', () => {
  it('shows real counts from the volunteers API', async () => {
    const mock = mockApi({
      ...signedInAdmin,
      'GET /api/volunteers': (req) => (req.query.status === 'SUSPENDED' ? listBody([], 3) : listBody([row(1)], 42)),
    })
    renderApp('/admin')
    const total = await screen.findByText('Volunteers', { selector: 'p' })
    expect(within(total.parentElement).getByText('42')).toBeInTheDocument()
    expect(within(screen.getByText('Active').parentElement).getByText('39')).toBeInTheDocument()
    expect(within(screen.getByText('Suspended').parentElement).getByText('3')).toBeInTheDocument()
    expect(mock.callsTo('GET /api/volunteers').map((c) => c.query)).toEqual(
      expect.arrayContaining([{ limit: '1' }, { limit: '1', status: 'SUSPENDED' }])
    )
  })

  it('shows an error with retry when the counts fail', async () => {
    mockApi({ ...signedInAdmin, 'GET /api/volunteers': { status: 500, body: { message: 'Internal server error' } } })
    renderApp('/admin')
    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})

describe('Volunteers list', () => {
  it('shows the volunteers returned by the backend and nothing else', async () => {
    mockApi({
      ...signedInAdmin,
      'GET /api/volunteers': listBody([row(1, { name: 'Priya Real' }), row(2, { status: 'SUSPENDED', lastLoginAt: '2026-03-01T09:30:00.000Z' })], 2),
    })
    renderApp('/admin/volunteers')
    const link = await screen.findByRole('link', { name: 'Priya Real' })
    expect(link).toHaveAttribute('href', '/admin/volunteers/id1')
    expect(screen.getByText('VOL-2026-0001')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Suspended')).toBeInTheDocument()
    expect(screen.getByText(/showing 1–2 of 2/i)).toBeInTheDocument()
    expect(screen.queryByText(/rahul verma|anita desai|suresh kumar/i)).not.toBeInTheDocument()
  })

  it('requests the first page with the page size by default', async () => {
    const mock = mockApi({ ...signedInAdmin, 'GET /api/volunteers': listBody([row(1)], 1) })
    renderApp('/admin/volunteers')
    await screen.findByText('Volunteer 1')
    expect(mock.callsTo('GET /api/volunteers')[0].query).toEqual({ page: '1', limit: '20' })
  })

  it('searches (debounced) and reflects it in the URL', async () => {
    const mock = mockApi({
      ...signedInAdmin,
      'GET /api/volunteers': (req) => (req.query.search ? listBody([row(7, { name: 'Asha Match' })], 1) : listBody([row(1)], 1)),
    })
    renderApp('/admin/volunteers')
    await screen.findByText('Volunteer 1')
    await userEvent.type(screen.getByLabelText('Search volunteers'), 'asha')

    expect(await screen.findByText('Asha Match')).toBeInTheDocument()
    expect(location()).toBe('/admin/volunteers?search=asha')
    const searches = mock.callsTo('GET /api/volunteers').filter((c) => c.query.search)
    expect(searches).toHaveLength(1)
    expect(searches[0].query.search).toBe('asha')
  })

  it('filters by status', async () => {
    const mock = mockApi({
      ...signedInAdmin,
      'GET /api/volunteers': (req) => (req.query.status === 'SUSPENDED' ? listBody([row(9, { status: 'SUSPENDED', name: 'Gone Away' })], 1) : listBody([row(1)], 1)),
    })
    renderApp('/admin/volunteers')
    await screen.findByText('Volunteer 1')
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'SUSPENDED')
    expect(await screen.findByText('Gone Away')).toBeInTheDocument()
    expect(location()).toBe('/admin/volunteers?status=SUSPENDED')
    expect(mock.callsTo('GET /api/volunteers').at(-1).query.status).toBe('SUSPENDED')
  })

  it('restores search, filter and page from the URL', async () => {
    const mock = mockApi({ ...signedInAdmin, 'GET /api/volunteers': listBody([row(21)], 41, 2) })
    renderApp('/admin/volunteers?search=abc&status=ACTIVE&page=2')
    await screen.findByText('Volunteer 21')
    expect(mock.callsTo('GET /api/volunteers')[0].query).toEqual({ page: '2', limit: '20', search: 'abc', status: 'ACTIVE' })
    expect(screen.getByLabelText('Search volunteers')).toHaveValue('abc')
    expect(screen.getByLabelText('Filter by status')).toHaveValue('ACTIVE')
  })

  it('paginates', async () => {
    const mock = mockApi({
      ...signedInAdmin,
      'GET /api/volunteers': (req) => (req.query.page === '2' ? listBody([row(21)], 25, 2) : listBody([row(1)], 25, 1)),
    })
    renderApp('/admin/volunteers')
    await screen.findByText('Volunteer 1')
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Volunteer 21')).toBeInTheDocument()
    expect(location()).toBe('/admin/volunteers?page=2')
    expect(screen.getByText(/showing 21–21 of 25/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByText('Volunteer 1')).toBeInTheDocument()
    expect(location()).toBe('/admin/volunteers')
    expect(mock.callsTo('GET /api/volunteers').at(-1).query.page).toBe('1')
  })

  it('distinguishes "nobody yet" from "no match"', async () => {
    mockApi({ ...signedInAdmin, 'GET /api/volunteers': listBody([], 0) })
    const { unmount } = renderApp('/admin/volunteers')
    expect(await screen.findByText(/no volunteers have registered yet/i)).toBeInTheDocument()
    unmount()

    mockApi({ ...signedInAdmin, 'GET /api/volunteers': listBody([], 0) })
    renderApp('/admin/volunteers?search=zzz')
    expect(await screen.findByText(/no volunteers match your search/i)).toBeInTheDocument()
  })

  it('shows an error with retry', async () => {
    let up = false
    mockApi({ ...signedInAdmin, 'GET /api/volunteers': () => (up ? listBody([row(1)], 1) : { status: 500, body: { message: 'Internal server error' } }) })
    renderApp('/admin/volunteers')
    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    up = true
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Volunteer 1')).toBeInTheDocument()
  })

  it('ignores a malformed page parameter', async () => {
    const mock = mockApi({ ...signedInAdmin, 'GET /api/volunteers': listBody([row(1)], 1) })
    renderApp('/admin/volunteers?page=abc')
    await screen.findByText('Volunteer 1')
    expect(mock.callsTo('GET /api/volunteers')[0].query.page).toBe('1')
  })
})

describe('Volunteer detail', () => {
  const detail = (overrides = {}) => ({
    volunteer: row(1, { name: 'Asha Rao', ...overrides }),
    stats: { activitiesAttended: 4, verifiedActivities: 3, verifiedHours: 9.25 },
  })

  it('shows the volunteer and derived stats from the backend', async () => {
    mockApi({ ...signedInAdmin, 'GET /api/volunteers/id1': { body: detail() } })
    renderApp('/admin/volunteers/id1')
    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument()
    expect(screen.getByText('Volunteer ID: VOL-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('v1@example.org')).toBeInTheDocument()
    expect(screen.getByText('9.25h')).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('needs a confirmation before suspending, then suspends through the API and refreshes', async () => {
    let status = 'ACTIVE'
    const mock = mockApi({
      ...signedInAdmin,
      'GET /api/volunteers/id1': () => ({ body: detail({ status }) }),
      'PATCH /api/volunteers/id1/status': (req) => {
        status = req.body.status
        return { body: { volunteer: row(1, { status }) } }
      },
    })
    renderApp('/admin/volunteers/id1')
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend volunteer' }))
    expect(mock.callsTo('PATCH /api/volunteers/id1/status')).toHaveLength(0)
    expect(screen.getByText('Suspend Asha Rao?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }))
    expect(await screen.findByRole('button', { name: 'Reactivate volunteer' })).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/volunteers/id1/status')[0].body).toEqual({ status: 'SUSPENDED' })
    expect(screen.getAllByText('Suspended').length).toBeGreaterThan(0)
  })

  it('can cancel a suspension without calling the API', async () => {
    const mock = mockApi({ ...signedInAdmin, 'GET /api/volunteers/id1': { body: detail() } })
    renderApp('/admin/volunteers/id1')
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend volunteer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Suspend volunteer' })).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/volunteers/id1/status')).toHaveLength(0)
  })

  it('reactivates a suspended volunteer', async () => {
    let status = 'SUSPENDED'
    const mock = mockApi({
      ...signedInAdmin,
      'GET /api/volunteers/id1': () => ({ body: detail({ status }) }),
      'PATCH /api/volunteers/id1/status': (req) => {
        status = req.body.status
        return { body: { volunteer: row(1, { status }) } }
      },
    })
    renderApp('/admin/volunteers/id1')
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivate volunteer' }))
    expect(await screen.findByRole('button', { name: 'Suspend volunteer' })).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/volunteers/id1/status')[0].body).toEqual({ status: 'ACTIVE' })
  })

  it('shows a failed status change without changing anything', async () => {
    mockApi({
      ...signedInAdmin,
      'GET /api/volunteers/id1': { body: detail() },
      'PATCH /api/volunteers/id1/status': { status: 500, body: { message: 'Internal server error' } },
    })
    renderApp('/admin/volunteers/id1')
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend volunteer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error')
  })

  it('shows not-found without a pointless retry', async () => {
    mockApi({ ...signedInAdmin, 'GET /api/volunteers/nope': { status: 404, body: { message: 'Volunteer not found', code: 'NOT_FOUND' } } })
    renderApp('/admin/volunteers/nope')
    expect(await screen.findByText('Volunteer not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all volunteers/i })).toHaveAttribute('href', '/admin/volunteers')
  })
})

describe('Admins', () => {
  const fill = async ({ name = 'Second Admin', email = 'second@example.org', password = 'temporary-password-1' } = {}) => {
    await userEvent.type(await screen.findByLabelText('Full name'), name)
    await userEvent.type(screen.getByLabelText('Email'), email)
    if (password) await userEvent.type(screen.getByLabelText('Temporary password'), password)
    await userEvent.click(screen.getByRole('button', { name: 'Create admin' }))
  }

  it('creates an admin with exactly the documented fields and shows the password once', async () => {
    const mock = mockApi({
      ...signedInAdmin,
      'POST /api/admins': { status: 201, body: { user: { ...adminUser, id: 'a2', name: 'Second Admin', email: 'second@example.org', mustChangePassword: true } } },
    })
    renderApp('/admin/admins')
    await fill()

    expect(await screen.findByText('Second Admin is now an admin')).toBeInTheDocument()
    expect(mock.callsTo('POST /api/admins')[0].body).toEqual({ name: 'Second Admin', email: 'second@example.org', temporaryPassword: 'temporary-password-1' })
    expect(screen.getByText('temporary-password-1', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('')
    expect(screen.getByLabelText('Temporary password')).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('temporary-password-1')).not.toBeInTheDocument()
  })

  it('shows a taken email against the email field', async () => {
    mockApi({
      ...signedInAdmin,
      'POST /api/admins': { status: 409, body: { message: 'An account with this email already exists', code: 'EMAIL_TAKEN' } },
    })
    renderApp('/admin/admins')
    await fill()
    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription('An account with this email already exists')
    expect(screen.queryByText(/is now an admin/i)).not.toBeInTheDocument()
  })

  it('maps password validation errors to the password field', async () => {
    mockApi({
      ...signedInAdmin,
      'POST /api/admins': {
        status: 400,
        body: { message: 'Validation failed', code: 'VALIDATION_ERROR', errors: [{ path: 'body.temporaryPassword', message: 'Password must be at least 10 characters' }] },
      },
    })
    renderApp('/admin/admins')
    await fill({ password: 'short' })
    expect(await screen.findByLabelText('Temporary password')).toHaveAccessibleDescription('Password must be at least 10 characters')
  })

  it('generates a strong random password that fits the server rules', async () => {
    mockApi(signedInAdmin)
    renderApp('/admin/admins')
    const field = await screen.findByLabelText('Temporary password')
    await userEvent.click(screen.getByRole('button', { name: /generate a password/i }))
    const first = field.value
    expect(first).toMatch(/^[A-Za-z2-9]{16}$/)
    expect(first).not.toMatch(/[0OIl1]/)
    await userEvent.click(screen.getByRole('button', { name: /generate a password/i }))
    expect(field.value).not.toBe(first)
  })

  it('does not add a fake list of admins', async () => {
    mockApi(signedInAdmin)
    renderApp('/admin/admins')
    await screen.findByRole('heading', { name: 'Add an admin' })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
