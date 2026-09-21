import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'
import { api } from '../api/client'
import { adminUser, mockApi, volunteerUser } from '../test/mockFetch'

const notSignedIn = { status: 401, body: { message: 'Authentication required', code: 'UNAUTHENTICATED' } }

// Shows what the context exposes and offers buttons for its actions.
function Probe() {
  const auth = useAuth()
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.email ?? 'none'}</p>
      <p data-testid="notice">{auth.notice ?? 'no notice'}</p>
      <button onClick={() => auth.login({ email: 'asha@example.org', password: 'pw' }).catch(() => {})}>login</button>
      <button onClick={() => auth.register({ name: 'A', email: 'asha@example.org', phone: '1234567', password: 'pw' })}>register</button>
      <button onClick={() => auth.logout()}>logout</button>
      <button onClick={() => auth.retry()}>retry</button>
      <button onClick={() => api.get('/volunteers/me').catch(() => {})}>call api</button>
    </div>
  )
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  )

const status = () => screen.getByTestId('status').textContent

describe('AuthProvider', () => {
  it('starts in loading and becomes authenticated when /auth/me succeeds', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderProbe()
    expect(status()).toBe('loading')
    await waitFor(() => expect(status()).toBe('authenticated'))
    expect(screen.getByTestId('user')).toHaveTextContent('asha@example.org')
  })

  it('becomes anonymous, without a notice, when nobody is signed in', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn })
    renderProbe()
    await waitFor(() => expect(status()).toBe('anonymous'))
    expect(screen.getByTestId('notice')).toHaveTextContent('no notice')
  })

  it('explains a suspended account found at startup', async () => {
    mockApi({ 'GET /api/auth/me': { status: 403, body: { message: 'suspended', code: 'ACCOUNT_SUSPENDED' } } })
    renderProbe()
    await waitFor(() => expect(status()).toBe('anonymous'))
    expect(screen.getByTestId('notice')).toHaveTextContent(/suspended/i)
  })

  it('reports an unreachable server as an error, not as signed out, and can retry', async () => {
    let up = false
    mockApi({ 'GET /api/auth/me': () => (up ? { body: { user: volunteerUser } } : { status: 502, body: undefined }) })
    renderProbe()
    await waitFor(() => expect(status()).toBe('error'))

    up = true
    await userEvent.click(screen.getByText('retry'))
    await waitFor(() => expect(status()).toBe('authenticated'))
  })

  it('logs in and registers, becoming authenticated', async () => {
    mockApi({
      'GET /api/auth/me': notSignedIn,
      'POST /api/auth/login': { body: { user: volunteerUser } },
      'POST /api/auth/register': { body: { user: volunteerUser } },
    })
    renderProbe()
    await waitFor(() => expect(status()).toBe('anonymous'))
    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(status()).toBe('authenticated'))
  })

  it('stays anonymous, with no notice, after a wrong password', async () => {
    mockApi({
      'GET /api/auth/me': notSignedIn,
      'POST /api/auth/login': { status: 401, body: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' } },
    })
    renderProbe()
    await waitFor(() => expect(status()).toBe('anonymous'))
    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(status()).toBe('anonymous'))
    expect(screen.getByTestId('notice')).toHaveTextContent('no notice')
  })

  it('logs out through the API and clears the user', async () => {
    const mock = mockApi({
      'GET /api/auth/me': { body: { user: volunteerUser } },
      'POST /api/auth/logout': { status: 204 },
    })
    renderProbe()
    await waitFor(() => expect(status()).toBe('authenticated'))
    await userEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(status()).toBe('anonymous'))
    expect(mock.callsTo('POST /api/auth/logout')).toHaveLength(1)
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('still clears local state when the logout request fails', async () => {
    mockApi({
      'GET /api/auth/me': { body: { user: volunteerUser } },
      'POST /api/auth/logout': { status: 503, body: undefined },
    })
    renderProbe()
    await waitFor(() => expect(status()).toBe('authenticated'))
    await userEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(status()).toBe('anonymous'))
  })

  it('clears the auth state centrally when any API call finds the session gone', async () => {
    mockApi({
      'GET /api/auth/me': { body: { user: volunteerUser } },
      'GET /api/volunteers/me': { status: 401, body: { message: 'expired', code: 'INVALID_SESSION' } },
    })
    renderProbe()
    await waitFor(() => expect(status()).toBe('authenticated'))
    await userEvent.click(screen.getByText('call api'))
    await waitFor(() => expect(status()).toBe('anonymous'))
    expect(screen.getByTestId('notice')).toHaveTextContent(/session has ended/i)
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('explains suspension when it happens mid-session', async () => {
    mockApi({
      'GET /api/auth/me': { body: { user: volunteerUser } },
      'GET /api/volunteers/me': { status: 403, body: { message: 'suspended', code: 'ACCOUNT_SUSPENDED' } },
    })
    renderProbe()
    await waitFor(() => expect(status()).toBe('authenticated'))
    await userEvent.click(screen.getByText('call api'))
    await waitFor(() => expect(screen.getByTestId('notice')).toHaveTextContent(/suspended/i))
  })

  it('never writes the session to browser storage or readable cookies', async () => {
    mockApi({
      'GET /api/auth/me': notSignedIn,
      'POST /api/auth/login': { body: { user: volunteerUser } },
    })
    renderProbe()
    await waitFor(() => expect(status()).toBe('anonymous'))
    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(status()).toBe('authenticated'))

    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })
})

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function renderRoutes(initialPath) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Where />
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/change-password" element={<p>change password page</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/account" element={<p>account page</p>} />
            <Route element={<RequireRole role="ADMIN" />}>
              <Route path="/admin" element={<p>admin page</p>} />
            </Route>
            <Route element={<RequireRole role="VOLUNTEER" />}>
              <Route path="/volunteer" element={<p>volunteer page</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RequireAuth', () => {
  it('shows a spinner while the session is being checked', () => {
    mockApi({ 'GET /api/auth/me': () => new Promise(() => {}) })
    renderRoutes('/account')
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i)
    expect(screen.queryByText('account page')).not.toBeInTheDocument()
  })

  it('sends anonymous visitors to sign-in, remembering the full destination', async () => {
    mockApi({ 'GET /api/auth/me': notSignedIn })
    renderRoutes('/account?tab=2#top')
    await screen.findByText('login page')
    expect(screen.getByTestId('where')).toHaveTextContent('/login?next=%2Faccount%3Ftab%3D2%23top')
  })

  it('renders the page for a signed-in user', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderRoutes('/account')
    expect(await screen.findByText('account page')).toBeInTheDocument()
  })

  it('forces a pending password change before anything else', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: { ...adminUser, mustChangePassword: true } } } })
    renderRoutes('/admin')
    expect(await screen.findByText('change password page')).toBeInTheDocument()
    expect(screen.queryByText('admin page')).not.toBeInTheDocument()
  })

  it('shows a retry screen, not the sign-in page, when the server is down', async () => {
    mockApi({ 'GET /api/auth/me': { status: 503, body: undefined } })
    renderRoutes('/account')
    expect(await screen.findByText(/couldn't check your session/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })
})

describe('RequireRole', () => {
  it('lets the matching role through', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderRoutes('/admin')
    expect(await screen.findByText('admin page')).toBeInTheDocument()
  })

  it('shows access denied to a volunteer on an admin route, without rendering it', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderRoutes('/admin')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(screen.queryByText('admin page')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to my dashboard/i })).toHaveAttribute('href', '/volunteer')
  })

  it('shows access denied to an admin on a volunteer route', async () => {
    mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderRoutes('/volunteer')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to my dashboard/i })).toHaveAttribute('href', '/admin')
  })
})
