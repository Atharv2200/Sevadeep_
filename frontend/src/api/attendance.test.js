import { describe, expect, it } from 'vitest'
import { activitiesApi } from './activities'
import { attendanceApi } from './attendance'
import { mockApi } from '../test/mockFetch'

const position = { latitude: 18.52, longitude: 73.85, accuracy: 12 }

describe('attendanceApi', () => {
  it('checks in with the token and the position, and nothing else', async () => {
    const mock = mockApi({ 'POST /api/activities/a1/attendance': { status: 201, body: { attendance: { id: 'x' } } } })
    const result = await attendanceApi.checkIn('a1', { token: 't', ...position, distanceMeters: 0, checkedInAt: 'now', volunteer: 'v' })
    expect(result).toEqual({ id: 'x' })
    expect(mock.calls[0].body).toEqual({ token: 't', ...position })
  })

  it('checks out with the position only', async () => {
    const mock = mockApi({ 'POST /api/activities/a1/attendance/check-out': { body: { attendance: { id: 'x' } } } })
    await attendanceApi.checkOut('a1', { ...position, token: 'nope' })
    expect(mock.calls[0].body).toEqual(position)
  })

  it('encodes ids in the path', async () => {
    const mock = mockApi({ 'GET /api/activities/a%2F1/attendance': { body: { items: [], total: 0 } } })
    await attendanceApi.live('a/1')
    expect(mock.calls).toHaveLength(1)
  })

  it('lists history with filters as query parameters', async () => {
    const mock = mockApi({ 'GET /api/attendance': { body: { items: [], page: 2, limit: 5, total: 0 } } })
    await attendanceApi.list({ page: 2, limit: 5, activity: 'a1', volunteer: undefined })
    expect(mock.calls[0].query).toEqual({ page: '2', limit: '5', activity: 'a1' })
  })
})

describe('activitiesApi.getQr', () => {
  it('returns what the server built, untouched', async () => {
    const qr = { url: 'https://x.test/attend/a1?t=1.abc', expiresAt: '2031-01-01T00:00:00.000Z', refreshInSeconds: 42 }
    mockApi({ 'GET /api/activities/a1/qr': { body: qr } })
    expect(await activitiesApi.getQr('a1')).toEqual(qr)
  })
})
