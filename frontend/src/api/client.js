// The only place the app talks HTTP. Every request is same-origin (/api), carries
// the httpOnly auth cookie automatically, and fails with an ApiError.

const BASE_URL = '/api'

// Error codes that mean "you are no longer signed in" (expired or revoked session,
// suspended account). A wrong password (INVALID_CREDENTIALS) deliberately is not one.
const SESSION_LOST_CODES = new Set(['UNAUTHENTICATED', 'INVALID_SESSION', 'ACCOUNT_SUSPENDED'])

export class ApiError extends Error {
  constructor(status, message, { code, errors } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    // Validation details: [{ path: 'body.email', message }]
    this.errors = errors ?? []
  }

  // Message for one form field, e.g. fieldError('email').
  fieldError(field) {
    return this.errors.find((e) => e.path === `body.${field}`)?.message
  }
}

let onSessionLost = null

// AuthContext registers itself here so a lost session is handled in one place.
export function setSessionLostHandler(handler) {
  onSessionLost = handler
}

function buildUrl(path, query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const queryString = params.toString()
  return `${BASE_URL}${path}${queryString ? `?${queryString}` : ''}`
}

async function readJson(response) {
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

function fallbackMessage(status) {
  if (status === 502 || status === 503 || status === 504) return 'The server is unavailable. Please try again shortly.'
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return 'The request could not be completed.'
}

// `isForm` sends `body` (a FormData) as-is: the browser sets the multipart
// boundary itself, so no Content-Type header is set here for it.
async function request(method, path, { body, query, signal, isForm = false } = {}) {
  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
    })
  }

  if (response.status === 204) return null

  const data = await readJson(response)
  if (!response.ok) {
    const error = new ApiError(response.status, data?.message ?? fallbackMessage(response.status), {
      code: data?.code,
      errors: data?.errors,
    })
    if (SESSION_LOST_CODES.has(error.code)) onSessionLost?.(error)
    throw error
  }
  return data
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body: body ?? {} }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
  postForm: (path, formData, options) => request('POST', path, { ...options, body: formData, isForm: true }),
}
