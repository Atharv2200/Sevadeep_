import { describe, expect, it } from 'vitest'
import { contributionsApi } from './contributions'
import { mockApi } from '../test/mockFetch'

describe('contributionsApi', () => {
  it('creates a contribution tied to an attendance, and sends nothing else even if asked to', async () => {
    const mock = mockApi({ 'POST /api/contributions': { status: 201, body: { contribution: { id: 'c1' } } } })
    const result = await contributionsApi.create({
      attendance: 'att1',
      description: 'Helped out.',
      status: 'VERIFIED',
      approvedHours: 5,
      revision: 3,
    })
    expect(result).toEqual({ id: 'c1' })
    expect(mock.calls[0].body).toEqual({ attendance: 'att1', description: 'Helped out.' })
  })

  it('edits only the description, even if asked to send more', async () => {
    const mock = mockApi({ 'PATCH /api/contributions/c1': { body: { contribution: { id: 'c1' } } } })
    await contributionsApi.update('c1', { description: 'Updated.', approvedHours: 9, status: 'VERIFIED', revision: 2 })
    expect(mock.calls[0].body).toEqual({ description: 'Updated.' })
  })

  it('reviews with a verdict, hours, an optional note and the revision', async () => {
    const mock = mockApi({ 'PATCH /api/contributions/c1/review': { body: { contribution: { id: 'c1' } } } })
    await contributionsApi.review('c1', { status: 'VERIFIED', approvedHours: 2.5, note: 'Great job', revision: 0 })
    expect(mock.calls[0].body).toEqual({ status: 'VERIFIED', approvedHours: 2.5, note: 'Great job', revision: 0 })
  })

  it('omits approvedHours and note when they are not given', async () => {
    const mock = mockApi({ 'PATCH /api/contributions/c1/review': { body: { contribution: { id: 'c1' } } } })
    await contributionsApi.review('c1', { status: 'REJECTED', approvedHours: undefined, note: undefined, revision: 1 })
    expect(mock.calls[0].body).toEqual({ status: 'REJECTED', revision: 1 })
  })

  it('lists with filters as query parameters', async () => {
    const mock = mockApi({ 'GET /api/contributions': { body: { items: [], page: 1, limit: 20, total: 0 } } })
    await contributionsApi.list({ page: 1, limit: 20, activity: 'act1', status: 'PENDING', volunteer: undefined })
    expect(mock.calls[0].query).toEqual({ page: '1', limit: '20', activity: 'act1', status: 'PENDING' })
  })

  it('encodes ids in the path', async () => {
    const mock = mockApi({ 'GET /api/contributions/c%2F1': { body: { contribution: { id: 'x' } } } })
    await contributionsApi.get('c/1')
    expect(mock.calls).toHaveLength(1)
  })
})
