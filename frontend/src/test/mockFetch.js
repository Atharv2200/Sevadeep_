import { vi } from 'vitest'

export function jsonResponse(status, body) {
  const headers = body === undefined ? {} : { 'Content-Type': 'application/json' }
  return new Response(body === undefined || status === 204 ? null : JSON.stringify(body), { status, headers })
}

// Repeated keys (e.g. several `photos` files) collapse into an array, the way the
// real backend (multer) sees them.
function formDataToObject(form) {
  const obj = {}
  for (const [key, value] of form.entries()) {
    if (key in obj) {
      obj[key] = Array.isArray(obj[key]) ? [...obj[key], value] : [obj[key], value]
    } else {
      obj[key] = value
    }
  }
  return obj
}

// Replaces window.fetch, so tests exercise the real API client, modules and pages
// and only the network is faked. `routes` maps "METHOD /api/path" to either a
// { status, body } object or a function (request) => { status, body }.
// Unmocked requests throw, so a page can never silently call something unexpected.
export function mockApi(routes = {}) {
  const calls = []
  const fetchMock = vi.fn(async (url, init = {}) => {
    const parsed = new URL(url, 'http://localhost')
    const method = (init.method ?? 'GET').toUpperCase()
    const key = `${method} ${parsed.pathname}`
    const request = {
      key,
      method,
      path: parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
      body: init.body ? (init.body instanceof FormData ? formDataToObject(init.body) : JSON.parse(init.body)) : undefined,
      init,
    }
    calls.push(request)

    const handler = routes[key]
    if (!handler) throw new Error(`Unmocked request: ${key}`)
    const { status = 200, body } = typeof handler === 'function' ? await handler(request) : handler
    return jsonResponse(status, body)
  })
  vi.stubGlobal('fetch', fetchMock)

  return {
    routes,
    calls,
    fetchMock,
    callsTo: (key) => calls.filter((call) => call.key === key),
  }
}

export const volunteerUser = {
  id: 'u-vol',
  email: 'asha@example.org',
  name: 'Asha Rao',
  role: 'VOLUNTEER',
  status: 'ACTIVE',
  mustChangePassword: false,
  lastLoginAt: null,
  volunteer: { id: 'v1', volunteerId: 'VOL-2026-0001', name: 'Asha Rao', phone: '+91 98765 43210', joinedAt: '2026-01-15T10:00:00.000Z' },
}

export const adminUser = {
  id: 'u-admin',
  email: 'root@example.org',
  name: 'Root Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
  mustChangePassword: false,
  lastLoginAt: null,
  volunteer: null,
}
