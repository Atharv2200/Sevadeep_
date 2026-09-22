import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { adminContribution, contributionPhoto, listBody } from '../../test/fixtures'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

const signedIn = { 'GET /api/auth/me': { body: { user: adminUser } } }

describe('admin Contributions list', () => {
  it('lists the volunteer, activity, submitted date and status, linking to the review page', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/contributions': listBody([adminContribution(1, { volunteer: { id: 'v1', volunteerId: 'VOL-2031-0001', name: 'Asha Rao' } })], 1, 1, 20),
    })
    renderApp('/admin/contributions')

    expect(await screen.findByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/admin/volunteers/v1')
    expect(screen.getByText('VOL-2031-0001')).toBeInTheDocument()
    expect(screen.getByText('Activity 1')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Pending review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/admin/contributions/con1')
    expect(mock.callsTo('GET /api/contributions')[0].query).toEqual({ page: '1', limit: '20' })
  })

  it('filters by status, reflected in the URL and the request', async () => {
    const mock = mockApi({
      ...signedIn,
      'GET /api/contributions': (req) =>
        req.query.status === 'VERIFIED'
          ? listBody([adminContribution(2, { status: 'VERIFIED', approvedHours: 2 })], 1, 1, 20)
          : listBody([adminContribution(1)], 1, 1, 20),
    })
    renderApp('/admin/contributions')
    await screen.findByText('Activity 1')

    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'VERIFIED')
    expect(await screen.findByText('Activity 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toBeInTheDocument()
    expect(mock.callsTo('GET /api/contributions').at(-1).query.status).toBe('VERIFIED')
  })

  it('shows an empty state', async () => {
    mockApi({ ...signedIn, 'GET /api/contributions': listBody([], 0, 1, 20) })
    renderApp('/admin/contributions')
    expect(await screen.findByText('No contributions yet')).toBeInTheDocument()
  })

  it('is not available to volunteers', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/admin/contributions')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/contributions')).toHaveLength(0)
  })
})

describe('admin contribution review', () => {
  const pending = adminContribution(1, {
    volunteer: { id: 'v1', volunteerId: 'VOL-2031-0001', name: 'Asha Rao' },
    attendance: { id: 'att1', checkedInAt: '2031-05-01T09:00:00.000Z', checkedOutAt: '2031-05-01T11:30:00.000Z' },
    suggestedHours: 2.5,
  })
  const routes = (over = {}) => ({ ...signedIn, 'GET /api/contributions/con1': { body: { contribution: pending } }, ...over })

  it('shows the volunteer, activity, description and the suggested duration', async () => {
    mockApi(routes())
    renderApp('/admin/contributions/con1')

    expect(await screen.findByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/admin/volunteers/v1')
    expect(screen.getByRole('link', { name: 'Activity 1' })).toHaveAttribute('href', '/admin/activities/act1')
    expect(screen.getByText(pending.description)).toBeInTheDocument()
    expect(screen.getByText('2.5h')).toBeInTheDocument()
  })

  it('says when there is nothing to suggest', async () => {
    mockApi(routes({ 'GET /api/contributions/con1': { body: { contribution: { ...pending, suggestedHours: null, attendance: { ...pending.attendance, checkedOutAt: null } } } } }))
    renderApp('/admin/contributions/con1')
    expect(await screen.findByText('Not available (no check-out)')).toBeInTheDocument()
    expect(screen.getByText('Not checked out')).toBeInTheDocument()
  })

  it('verifies with admin-entered hours, pre-filled with the suggested duration, and an optional note', async () => {
    // The page re-fetches after a successful review, so the GET mock must reflect it
    // (like the existing activity/volunteer status-change tests do).
    let current = pending
    const mock = mockApi(
      routes({
        'GET /api/contributions/con1': () => ({ body: { contribution: current } }),
        'PATCH /api/contributions/con1/review': (req) => {
          current = {
            ...pending,
            status: req.body.status,
            approvedHours: req.body.approvedHours,
            revision: pending.revision + 1,
            review: { reviewedAt: '2031-05-02T00:00:00Z', note: req.body.note ?? '', reviewedBy: 'u-admin' },
          }
          return { body: { contribution: current } }
        },
      })
    )
    renderApp('/admin/contributions/con1')
    await userEvent.click(await screen.findByRole('button', { name: /^verify$/i }))

    const hours = screen.getByLabelText(/approved hours/i)
    expect(hours).toHaveValue(2.5)
    await userEvent.clear(hours)
    await userEvent.type(hours, '3')
    await userEvent.type(screen.getByLabelText(/note/i), 'Great job')
    await userEvent.click(screen.getByRole('button', { name: /confirm verification/i }))

    expect(await screen.findByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Approved: 3h')).toBeInTheDocument()
    expect(screen.getByText('Great job')).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/contributions/con1/review')[0].body).toEqual({ status: 'VERIFIED', approvedHours: 3, note: 'Great job', revision: 0 })
    expect(screen.queryByRole('button', { name: /confirm verification/i })).not.toBeInTheDocument()
  })

  it('rejects with an optional note and no hours field at all', async () => {
    let current = pending
    const mock = mockApi(
      routes({
        'GET /api/contributions/con1': () => ({ body: { contribution: current } }),
        'PATCH /api/contributions/con1/review': (req) => {
          current = {
            ...pending,
            status: req.body.status,
            approvedHours: null,
            revision: pending.revision + 1,
            review: { reviewedAt: '2031-05-02T00:00:00Z', note: req.body.note ?? '', reviewedBy: 'u-admin' },
          }
          return { body: { contribution: current } }
        },
      })
    )
    renderApp('/admin/contributions/con1')
    await userEvent.click(await screen.findByRole('button', { name: /^reject$/i }))
    expect(screen.queryByLabelText(/approved hours/i)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/note/i), 'Not enough detail')
    await userEvent.click(screen.getByRole('button', { name: /confirm rejection/i }))

    expect(await screen.findByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('Not enough detail')).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/contributions/con1/review')[0].body).toEqual({ status: 'REJECTED', note: 'Not enough detail', revision: 0 })
  })

  it('shows a server validation error against the approved hours field', async () => {
    mockApi(
      routes({
        'PATCH /api/contributions/con1/review': {
          status: 400,
          body: { message: 'Validation failed', code: 'VALIDATION_ERROR', errors: [{ path: 'body.approvedHours', message: 'approvedHours must be in 0.25-hour increments' }] },
        },
      })
    )
    renderApp('/admin/contributions/con1')
    await userEvent.click(await screen.findByRole('button', { name: /^verify$/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm verification/i }))
    expect(await screen.findByLabelText(/approved hours/i)).toHaveAccessibleDescription('approvedHours must be in 0.25-hour increments')
  })

  it('on a conflict, refreshes instead of overwriting and shows what actually happened', async () => {
    let reviewed = false
    const mock = mockApi(
      routes({
        'GET /api/contributions/con1': () => ({
          body: {
            contribution: reviewed
              ? { ...pending, status: 'VERIFIED', revision: 1, approvedHours: 1, review: { reviewedAt: '2031-05-02T00:00:00Z', note: '', reviewedBy: 'someone-else' } }
              : pending,
          },
        }),
        'PATCH /api/contributions/con1/review': () => {
          reviewed = true
          return { status: 409, body: { code: 'CONTRIBUTION_ALREADY_REVIEWED', message: 'This contribution has already been reviewed' } }
        },
      })
    )
    renderApp('/admin/contributions/con1')
    await userEvent.click(await screen.findByRole('button', { name: /^verify$/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm verification/i }))

    const banner = (await screen.findByText('This contribution changed')).closest('div')
    expect(banner).toHaveTextContent(/already been reviewed/i)
    await waitFor(() => expect(screen.getByText('Verified')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /confirm verification/i })).not.toBeInTheDocument()
    expect(mock.callsTo('GET /api/contributions/con1').length).toBeGreaterThanOrEqual(2)
  })

  it('a review already locked (not PENDING) offers no review form', async () => {
    mockApi(
      routes({
        'GET /api/contributions/con1': {
          body: { contribution: { ...pending, status: 'VERIFIED', approvedHours: 2, review: { reviewedAt: '2031-05-02T00:00:00Z', note: '', reviewedBy: 'u-admin' } } },
        },
      })
    )
    renderApp('/admin/contributions/con1')
    expect(await screen.findByText('already been reviewed and can no longer be changed', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^verify$|^reject$/i })).not.toBeInTheDocument()
  })

  it('is admin-only', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: volunteerUser } } })
    renderApp('/admin/contributions/con1')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/contributions/con1')).toHaveLength(0)
  })

  it('displays the submitted photos, read-only', async () => {
    mockApi(
      routes({
        'GET /api/contributions/con1': {
          body: { contribution: { ...pending, photos: [contributionPhoto(1), contributionPhoto(2)] } },
        },
      })
    )
    renderApp('/admin/contributions/con1')

    expect(await screen.findByAltText('photo1.jpg')).toHaveAttribute('src', '/api/contributions/con1/photos/photo1')
    expect(screen.getByAltText('photo2.jpg')).toHaveAttribute('src', '/api/contributions/con1/photos/photo2')
    expect(screen.queryByLabelText('Add photos')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove photo/i })).not.toBeInTheDocument()
  })

  it('shows nothing extra when the contribution has no photos', async () => {
    mockApi(routes())
    renderApp('/admin/contributions/con1')
    await screen.findByText(pending.description)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('statistics come from the API, not a local count', () => {
  it('renders a volunteer\'s activitiesAttended, verifiedActivities and verifiedHours from the volunteer detail endpoint', async () => {
    const detail = {
      volunteer: { id: 'v1', volunteerId: 'VOL-2031-0001', name: 'Asha Rao', email: 'asha@example.org', phone: '+91 90000 00000', status: 'ACTIVE', joinedAt: '2031-01-01T00:00:00.000Z', lastLoginAt: null },
      stats: { activitiesAttended: 5, verifiedActivities: 2, verifiedHours: 6.5 },
    }
    const mock = mockApi({ ...signedIn, 'GET /api/volunteers/v1': { body: detail }, 'GET /api/attendance': listBody([], 0, 1, 10) })
    renderApp('/admin/volunteers/v1')
    expect(await screen.findByText('6.5h')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(mock.callsTo('GET /api/contributions')).toHaveLength(0)
  })
})
