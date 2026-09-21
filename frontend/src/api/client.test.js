import { describe, expect, it, vi } from 'vitest'
import { ApiError, api, setSessionLostHandler } from './client'
import { authApi } from './auth'
import { volunteersApi } from './volunteers'
import { adminsApi } from './admins'
import { jsonResponse, mockApi } from '../test/mockFetch'

describe('api client', () => {
  it('calls same-origin /api paths with cookies and no hardcoded host', async () => {
    const mock = mockApi({ 'GET /api/things': { body: { ok: true } } })
    await api.get('/things')
    const [url, init] = mock.fetchMock.mock.calls[0]
    expect(url).toBe('/api/things')
    expect(url).not.toMatch(/localhost|https?:/)
    expect(init.credentials).toBe('same-origin')
    expect(init.headers).toBeUndefined()
  })

  it('never sends an Authorization header', async () => {
    const mock = mockApi({ 'POST /api/things': { body: {} } })
    await api.post('/things', { a: 1 })
    const [, init] = mock.fetchMock.mock.calls[0]
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization/i)
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe('{"a":1}')
  })

  it('builds query strings, skipping empty values', async () => {
    const mock = mockApi({ 'GET /api/things': { body: {} } })
    await api.get('/things', { query: { page: 2, search: 'a b', status: '', limit: undefined, x: null } })
    expect(mock.fetchMock.mock.calls[0][0]).toBe('/api/things?page=2&search=a+b')
  })

  it('resolves to null for 204 responses', async () => {
    mockApi({ 'POST /api/things': { status: 204 } })
    expect(await api.post('/things')).toBeNull()
  })

  it('throws an ApiError carrying status, message, code and field errors', async () => {
    mockApi({
      'POST /api/things': {
        status: 400,
        body: { message: 'Validation failed', code: 'VALIDATION_ERROR', errors: [{ path: 'body.email', message: 'Enter a valid email address' }] },
      },
    })
    const error = await api.post('/things', {}).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Validation failed')
    expect(error.fieldError('email')).toBe('Enter a valid email address')
    expect(error.fieldError('name')).toBeUndefined()
  })

  it('turns a network failure into a friendly NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await api.get('/things').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/could not reach the server/i)
  })

  it('passes aborts through untouched', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    await expect(api.get('/things')).rejects.toBe(abort)
  })

  it('copes with non-JSON error bodies (e.g. a proxy 502 page)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<h1>Bad Gateway</h1>', { status: 502, headers: { 'Content-Type': 'text/html' } })))
    const error = await api.get('/things').catch((e) => e)
    expect(error.status).toBe(502)
    expect(error.message).toMatch(/unavailable/i)
    expect(error.message).not.toMatch(/<h1>/)
  })

  it('copes with malformed JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{oops', { status: 500, headers: { 'Content-Type': 'application/json' } })))
    const error = await api.get('/things').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(500)
  })
})

describe('session-lost handling', () => {
  const errorResponse = (status, code) => ({ status, body: { message: 'x', code } })

  it.each([
    [401, 'UNAUTHENTICATED'],
    [401, 'INVALID_SESSION'],
    [403, 'ACCOUNT_SUSPENDED'],
  ])('notifies the handler for %s %s', async (status, code) => {
    mockApi({ 'GET /api/things': errorResponse(status, code) })
    const handler = vi.fn()
    setSessionLostHandler(handler)
    await api.get('/things').catch(() => {})
    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].code).toBe(code)
    setSessionLostHandler(null)
  })

  it.each([
    [401, 'INVALID_CREDENTIALS'],
    [403, 'FORBIDDEN'],
    [403, 'PASSWORD_CHANGE_REQUIRED'],
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMITED'],
    [500, undefined],
  ])('does not treat %s %s as a lost session', async (status, code) => {
    mockApi({ 'GET /api/things': errorResponse(status, code) })
    const handler = vi.fn()
    setSessionLostHandler(handler)
    await api.get('/things').catch(() => {})
    expect(handler).not.toHaveBeenCalled()
    setSessionLostHandler(null)
  })
})

describe('resource modules', () => {
  it('auth: returns the user and sends only the documented fields', async () => {
    const user = { id: 'u1' }
    const mock = mockApi({
      'GET /api/auth/me': { body: { user } },
      'POST /api/auth/login': { body: { user } },
      'POST /api/auth/register': { body: { user } },
      'POST /api/auth/logout': { status: 204 },
      'POST /api/auth/change-password': { body: { user } },
    })
    expect(await authApi.me()).toEqual(user)
    expect(await authApi.login({ email: 'a@b.co', password: 'pw', extra: 'ignored' })).toEqual(user)
    expect(mock.callsTo('POST /api/auth/login')[0].body).toEqual({ email: 'a@b.co', password: 'pw' })
    await authApi.register({ name: 'N', email: 'a@b.co', phone: '1234567', password: 'pw', role: 'ADMIN' })
    expect(mock.callsTo('POST /api/auth/register')[0].body).toEqual({ name: 'N', email: 'a@b.co', phone: '1234567', password: 'pw' })
    expect(await authApi.logout()).toBeNull()
    await authApi.changePassword({ currentPassword: 'a', newPassword: 'b', junk: 1 })
    expect(mock.callsTo('POST /api/auth/change-password')[0].body).toEqual({ currentPassword: 'a', newPassword: 'b' })
  })

  it('volunteers: profile updates can only carry name and phone', async () => {
    const mock = mockApi({ 'PATCH /api/volunteers/me': { body: { volunteer: { id: 'v1' } } } })
    await volunteersApi.updateMe({ name: 'N', phone: '1234567', volunteerId: 'VOL-1', status: 'ACTIVE' })
    expect(mock.callsTo('PATCH /api/volunteers/me')[0].body).toEqual({ name: 'N', phone: '1234567' })
  })

  it('volunteers: list forwards paging and filters; ids are URL-encoded', async () => {
    const mock = mockApi({
      'GET /api/volunteers': { body: { items: [], page: 1, limit: 20, total: 0 } },
      'PATCH /api/volunteers/a%2Fb/status': { body: { volunteer: {} } },
    })
    await volunteersApi.list({ page: 2, limit: 10, search: 'asha', status: 'SUSPENDED' })
    expect(mock.calls[0].query).toEqual({ page: '2', limit: '10', search: 'asha', status: 'SUSPENDED' })
    await volunteersApi.setStatus('a/b', 'SUSPENDED')
    expect(mock.fetchMock.mock.calls[1][0]).toBe('/api/volunteers/a%2Fb/status')
  })

  it('admins: sends name, email and temporaryPassword only', async () => {
    const mock = mockApi({ 'POST /api/admins': { status: 201, body: { user: { id: 'a1' } } } })
    await adminsApi.create({ name: 'N', email: 'a@b.co', temporaryPassword: 'x'.repeat(12), role: 'ADMIN' })
    expect(mock.calls[0].body).toEqual({ name: 'N', email: 'a@b.co', temporaryPassword: 'x'.repeat(12) })
  })
})

describe('jsonResponse helper', () => {
  it('builds a JSON response', async () => {
    expect(await jsonResponse(200, { a: 1 }).json()).toEqual({ a: 1 })
  })
})
