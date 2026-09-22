import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

const notSignedIn = { status: 401, body: { message: 'Authentication required', code: 'UNAUTHENTICATED' } }
const location = () => screen.getByTestId('location').textContent

describe('public site', () => {
  it('renders the landing page sections', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: /about sevadeep/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /our activities/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /get involved/i })).toBeInTheDocument()
    expect(screen.getByText('Clothes Distribution', { selector: 'h3' })).toBeInTheDocument()
  })

  it('offers sign in and registration to visitors, and none of the old mock pages', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn })
    renderApp('/')
    const nav = within(await screen.findByRole('navigation'))
    await waitFor(() => expect(nav.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login'))
    expect(nav.getByRole('link', { name: /volunteer now/i })).toHaveAttribute('href', '/register')
    for (const retired of [/scanner/i, /tracker/i, /verify/i]) {
      expect(nav.queryByText(retired)).not.toBeInTheDocument()
    }
    expect(nav.getByRole('link', { name: /^about$/i })).toHaveAttribute('href', '/#about')
    expect(screen.getByRole('link', { name: /join as volunteer/i })).toHaveAttribute('href', '/register')
  })

  it('shows the dashboard link and sign out to a signed-in user, and signs out', async () => {
    const mock = mockApi({
      'GET /api/auth/me': { body: { user: volunteerUser } },
      'POST /api/auth/logout': { status: 204 },
    })
    renderApp('/')
    const nav = within(await screen.findByRole('navigation'))
    expect(await nav.findByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/volunteer')
    expect(screen.getByRole('link', { name: /open my dashboard/i })).toHaveAttribute('href', '/volunteer')

    await userEvent.click(nav.getByRole('button', { name: /sign out/i }))
    expect(await nav.findByRole('link', { name: /sign in/i })).toBeInTheDocument()
    expect(mock.callsTo('POST /api/auth/logout')).toHaveLength(1)
  })

  it('links admins to the admin area', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderApp('/')
    expect(await within(await screen.findByRole('navigation')).findByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/admin')
  })

  it('shows a 404 page for unknown routes', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn })
    renderApp('/no/such/page')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('still renders the public site when the API is down', async () => {
    mockApi({ 'GET /api/auth/me': { status: 503, body: undefined } })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: /about sevadeep/i })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })
})

describe('Login', () => {
  const fill = async (email = 'asha@example.org', password = 'correct-horse-battery') => {
    await userEvent.type(await screen.findByLabelText('Email'), email)
    await userEvent.type(screen.getByLabelText('Password'), password)
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
  }

  it('signs a volunteer in and lands on their dashboard', async () => {
    const mock = mockApi({
      'GET /api/auth/me': notSignedIn,
      'POST /api/auth/login': { body: { user: volunteerUser } },
    })
    renderApp('/login')
    await fill()
    await waitFor(() => expect(location()).toBe('/volunteer'))
    expect(mock.callsTo('POST /api/auth/login')[0].body).toEqual({ email: 'asha@example.org', password: 'correct-horse-battery' })
  })

  it('sends an admin to the admin area', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/login': { body: { user: adminUser } } })
    renderApp('/login')
    await fill('root@example.org')
    await waitFor(() => expect(location()).toBe('/admin'))
  })

  it('returns to the page the visitor was heading for (?next=)', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/login': { body: { user: volunteerUser } } })
    renderApp(`/login?next=${encodeURIComponent('/attend/abc123?t=tok')}`)
    await fill()
    await waitFor(() => expect(location()).toBe('/attend/abc123?t=tok'))
  })

  it.each([
    ['another origin', 'https://evil.example/x'],
    ['protocol-relative', '//evil.example'],
    ['backslash', '/\\evil.example'],
    ['javascript url', 'javascript:alert(1)'],
  ])('ignores an unsafe ?next= (%s) and uses the role home', async (_label, unsafe) => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/login': { body: { user: volunteerUser } } })
    renderApp(`/login?next=${encodeURIComponent(unsafe)}`)
    await fill()
    await waitFor(() => expect(location()).toBe('/volunteer'))
  })

  it('carries ?next= over to registration', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn })
    renderApp(`/login?next=${encodeURIComponent('/attend/abc')}`)
    expect(await screen.findByRole('link', { name: /create a volunteer account/i })).toHaveAttribute('href', '/register?next=%2Fattend%2Fabc')
  })

  it('shows the server message for a wrong password and stays on the page', async () => {
    mockApi({
      'GET /api/auth/me': notSignedIn,
      'POST /api/auth/login': { status: 401, body: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' } },
    })
    renderApp('/login')
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(location()).toBe('/login')
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeEnabled()
  })

  it.each([
    [403, 'ACCOUNT_SUSPENDED', 'This account is suspended'],
    [429, 'RATE_LIMITED', 'Too many requests, please try again later'],
  ])('shows %s %s', async (status, code, message) => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/login': { status, body: { message, code } } })
    renderApp('/login')
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('shows a friendly message when the server cannot be reached', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/login': () => { throw new TypeError('Failed to fetch') } })
    renderApp('/login')
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i)
  })

  it('redirects a signed-in visitor away from the sign-in page', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/login')
    await waitFor(() => expect(location()).toBe('/volunteer'))
  })

  it('stores nothing in browser storage after signing in', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/login': { body: { user: volunteerUser } } })
    renderApp('/login')
    await fill()
    await waitFor(() => expect(location()).toBe('/volunteer'))
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })
})

describe('Register', () => {
  const details = { name: 'Asha Rao', email: 'asha@example.org', phone: '+91 98765 43210', password: 'correct-horse-battery' }
  const fill = async (overrides = {}) => {
    const values = { ...details, ...overrides }
    await userEvent.type(await screen.findByLabelText('Full name'), values.name)
    await userEvent.type(screen.getByLabelText('Email'), values.email)
    await userEvent.type(screen.getByLabelText('Phone number'), values.phone)
    await userEvent.type(screen.getByLabelText('Password'), values.password)
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
  }

  it('registers, is signed in straight away, and lands on the dashboard', async () => {
    const mock = mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/register': { status: 201, body: { user: volunteerUser } } })
    renderApp('/register')
    await fill()
    await waitFor(() => expect(location()).toBe('/volunteer'))
    expect(mock.callsTo('POST /api/auth/register')[0].body).toEqual(details)
  })

  it('returns to the page the visitor was heading for after registering (?next=)', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/register': { status: 201, body: { user: volunteerUser } } })
    renderApp(`/register?next=${encodeURIComponent('/attend/abc123?t=tok')}`)
    await fill()
    await waitFor(() => expect(location()).toBe('/attend/abc123?t=tok'))
  })

  it('shows a taken email against the email field', async () => {
    mockApi({
      'GET /api/auth/me': notSignedIn,
      'POST /api/auth/register': { status: 409, body: { message: 'An account with this email already exists', code: 'EMAIL_TAKEN' } },
    })
    renderApp('/register')
    await fill()
    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription('An account with this email already exists')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('maps server validation errors to their fields', async () => {
    mockApi({
      'GET /api/auth/me': notSignedIn,
      'POST /api/auth/register': {
        status: 400,
        body: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: [
            { path: 'body.password', message: 'Password must be at least 10 characters' },
            { path: 'body.phone', message: 'Enter a valid phone number' },
          ],
        },
      },
    })
    renderApp('/register')
    await fill({ password: 'short' })
    expect(await screen.findByLabelText('Password')).toHaveAccessibleDescription('Password must be at least 10 characters')
    expect(screen.getByLabelText('Phone number')).toHaveAccessibleDescription('Enter a valid phone number')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows unexpected failures in an alert', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn, 'POST /api/auth/register': { status: 500, body: { message: 'Internal server error' } } })
    renderApp('/register')
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error')
  })
})

describe('ChangePassword', () => {
  const fill = async ({ current = 'temporary-password-1', next = 'my-own-new-password', confirm = next } = {}) => {
    await userEvent.type(await screen.findByLabelText('Current password'), current)
    await userEvent.type(screen.getByLabelText('New password'), next)
    await userEvent.type(screen.getByLabelText('Confirm new password'), confirm)
    await userEvent.click(screen.getByRole('button', { name: /^change password$/i }))
  }
  const pending = { ...adminUser, mustChangePassword: true }

  it('requires signing in first', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn })
    renderApp('/change-password')
    await waitFor(() => expect(location()).toBe('/login?next=%2Fchange-password'))
  })

  it('tells an admin with a temporary password why they are here, then sends them to the admin area', async () => {
    const mock = mockApi({
      'GET /api/auth/me': { body: { user: pending } },
      'POST /api/auth/change-password': { body: { user: adminUser } },
    })
    renderApp('/change-password')
    expect(await screen.findByText(/using a temporary password/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /back to my dashboard/i })).not.toBeInTheDocument()

    await fill()
    await waitFor(() => expect(location()).toBe('/admin'))
    expect(mock.callsTo('POST /api/auth/change-password')[0].body).toEqual({ currentPassword: 'temporary-password-1', newPassword: 'my-own-new-password' })
  })

  it('does not call the API when the confirmation does not match', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/change-password')
    await fill({ current: 'old-password-123', next: 'my-own-new-password', confirm: 'something-else-1' })
    expect(await screen.findByLabelText('Confirm new password')).toHaveAccessibleDescription('The passwords do not match.')
    expect(mock.callsTo('POST /api/auth/change-password')).toHaveLength(0)
  })

  it('shows a wrong current password against that field', async () => {
    mockApi({
      'GET /api/auth/me': { body: { user: volunteerUser } },
      'POST /api/auth/change-password': { status: 400, body: { message: 'Current password is incorrect', code: 'INVALID_CURRENT_PASSWORD' } },
    })
    renderApp('/change-password')
    await fill()
    expect(await screen.findByLabelText('Current password')).toHaveAccessibleDescription('Current password is incorrect')
  })

  it('lets a normal user go back', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/change-password')
    expect(await screen.findByRole('link', { name: /back to my dashboard/i })).toHaveAttribute('href', '/volunteer')
  })
})
