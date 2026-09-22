import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

const location = () => screen.getByTestId('location').textContent

const profile = { ...volunteerUser.volunteer, email: volunteerUser.email }
const stats = { activitiesAttended: 7, verifiedActivities: 5, verifiedHours: 12.5 }
const signedIn = { 'GET /api/auth/me': { body: { user: volunteerUser } } }

describe('volunteer routes and guards', () => {
  it('sends an anonymous visitor to sign in, remembering the destination', async () => {
    mockApi({ 'GET /api/auth/me': { status: 401, body: { message: 'x', code: 'UNAUTHENTICATED' } } })
    renderApp('/volunteer/profile')
    await waitFor(() => expect(location()).toBe('/login?next=%2Fvolunteer%2Fprofile'))
  })

  it('shows access denied to an admin, without loading any volunteer data', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderApp('/volunteer')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/volunteers/me')).toHaveLength(0)
  })

  it('has a working shell: navigation, account links and sign out', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/volunteers/me': { body: { volunteer: profile, stats } },
      'POST /api/auth/logout': { status: 204 },
    })
    renderApp('/volunteer')
    const nav = within(await screen.findByRole('navigation', { name: /volunteer navigation/i }))
    expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/volunteer')
    expect(nav.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/volunteer/profile')
    expect(screen.getByRole('link', { name: /password/i })).toHaveAttribute('href', '/change-password')
    expect(nav.getByRole('link', { name: 'Activities' })).toHaveAttribute('href', '/volunteer/activities')
    expect(nav.getByRole('link', { name: 'Contributions' })).toHaveAttribute('href', '/volunteer/contributions')
    // No link to a page that does not exist yet.
    expect(nav.queryByRole('link', { name: /attendance/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(location()).toBe('/'))
    expect(mock.callsTo('POST /api/auth/logout')).toHaveLength(1)
  })

  it('goes straight home on sign out instead of bouncing through the sign-in page', async () => {
    let release
    const gate = new Promise((resolve) => { release = resolve })
    mockApi({
      ...signedIn,
      'GET /api/volunteers/me': { body: { volunteer: profile, stats } },
      'POST /api/auth/logout': async () => {
        await gate
        return { status: 204 }
      },
    })
    renderApp('/volunteer')
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))

    // The logout request is still in flight: we must already be on the home page.
    await waitFor(() => expect(location()).toBe('/'))
    release()
    await waitFor(() => expect(within(screen.getByRole('navigation')).getByRole('link', { name: /sign in/i })).toBeInTheDocument())
    expect(location()).toBe('/')
  })

  it('shows a not-found page inside the shell for unknown volunteer routes', async () => {
    mockApi(signedIn)
    renderApp('/volunteer/nope')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /volunteer navigation/i })).toBeInTheDocument()
  })
})

describe('Dashboard', () => {
  it('shows the profile and derived stats returned by the backend', async () => {
    mockApi({ ...signedIn, 'GET /api/volunteers/me': { body: { volunteer: profile, stats } } })
    renderApp('/volunteer')

    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument()
    expect(screen.getByText('Volunteer ID: VOL-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('asha@example.org')).toBeInTheDocument()
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument()
    expect(screen.getByText('12.5h')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('contains no mock data or retired QR section', async () => {
    mockApi({ ...signedIn, 'GET /api/volunteers/me': { body: { volunteer: profile, stats: { activitiesAttended: 0, verifiedActivities: 0, verifiedHours: 0 } } } })
    renderApp('/volunteer')
    await screen.findByRole('heading', { name: 'Asha Rao' })
    for (const mock of [/priya sharma/i, /VOL-2024-001/, /qr code/i, /45h/, /food distribution/i]) {
      expect(screen.queryByText(mock)).not.toBeInTheDocument()
    }
    expect(document.querySelector('svg#volunteer-qr')).toBeNull()
    expect(screen.getByText('0h')).toBeInTheDocument()
  })

  it('shows a loading state until the data arrives', async () => {
    let release
    const gate = new Promise((resolve) => { release = resolve })
    mockApi({
      ...signedIn,
      'GET /api/volunteers/me': async () => {
        await gate
        return { body: { volunteer: profile, stats } }
      },
    })
    renderApp('/volunteer')
    expect(await screen.findByText(/loading your dashboard/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Asha Rao' })).not.toBeInTheDocument()

    release()
    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument()
    expect(screen.queryByText(/loading your dashboard/i)).not.toBeInTheDocument()
  })

  it('shows an error with a working retry', async () => {
    let up = false
    mockApi({
      ...signedIn,
      'GET /api/volunteers/me': () => (up ? { body: { volunteer: profile, stats } } : { status: 500, body: { message: 'Internal server error' } }),
    })
    renderApp('/volunteer')
    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    up = true
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument()
  })

  it('returns to sign-in, with a notice, if the session ends while the page loads', async () => {
    mockApi({
      ...signedIn,
      'GET /api/volunteers/me': { status: 401, body: { message: 'expired', code: 'INVALID_SESSION' } },
    })
    renderApp('/volunteer')
    await waitFor(() => expect(location()).toBe('/login?next=%2Fvolunteer'))
    expect(await screen.findByText(/your session has ended/i)).toBeInTheDocument()
  })
})

describe('Profile', () => {
  it('shows the account details, with the immutable ones read-only', async () => {
    mockApi(signedIn)
    renderApp('/volunteer/profile')
    expect(await screen.findByLabelText('Full name')).toHaveValue('Asha Rao')
    expect(screen.getByLabelText('Phone number')).toHaveValue('+91 98765 43210')
    expect(screen.getByText('VOL-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('asha@example.org')).toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/volunteer id/i)).not.toBeInTheDocument()
  })

  it('saves only name and phone, then refreshes the account', async () => {
    let user = volunteerUser
    const mock = mockApi({
      'GET /api/auth/me': () => ({ body: { user } }),
      'PATCH /api/volunteers/me': (req) => {
        user = { ...volunteerUser, name: req.body.name, volunteer: { ...volunteerUser.volunteer, ...req.body } }
        return { body: { volunteer: user.volunteer } }
      },
    })
    renderApp('/volunteer/profile')

    const save = await screen.findByRole('button', { name: /save changes/i })
    expect(save).toBeDisabled()

    const name = screen.getByLabelText('Full name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Asha K. Rao')
    expect(save).toBeEnabled()
    await userEvent.click(save)

    expect(await screen.findByText(/profile has been updated/i)).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/volunteers/me')[0].body).toEqual({ name: 'Asha K. Rao', phone: '+91 98765 43210' })
    expect(mock.callsTo('GET /api/auth/me').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('shows a server validation error against its field', async () => {
    mockApi({
      ...signedIn,
      'PATCH /api/volunteers/me': {
        status: 400,
        body: { message: 'Validation failed', code: 'VALIDATION_ERROR', errors: [{ path: 'body.phone', message: 'Enter a valid phone number' }] },
      },
    })
    renderApp('/volunteer/profile')
    const phone = await screen.findByLabelText('Phone number')
    await userEvent.clear(phone)
    await userEvent.type(phone, 'abc')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByLabelText('Phone number')).toHaveAccessibleDescription('Enter a valid phone number')
    expect(screen.queryByText(/profile has been updated/i)).not.toBeInTheDocument()
  })
})
