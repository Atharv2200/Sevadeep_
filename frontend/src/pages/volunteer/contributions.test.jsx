import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../../test/renderApp'
import { activity, attendanceRecord, contribution, emptyPage, listBody } from '../../test/fixtures'
import { adminUser, mockApi, volunteerUser } from '../../test/mockFetch'

const signedIn = { 'GET /api/auth/me': { body: { user: volunteerUser } } }
const open = activity(1)
const attended = attendanceRecord(1)

const base = (over = {}) => ({
  ...signedIn,
  'GET /api/activities/act1': { body: { activity: open } },
  'GET /api/attendance': emptyPage,
  'GET /api/contributions': emptyPage,
  ...over,
})

describe('Contribution submission on the activity page', () => {
  it('offers no contribution section when the volunteer has not attended', async () => {
    mockApi(base())
    renderApp('/volunteer/activities/act1')
    await screen.findByRole('heading', { name: 'Activity 1', level: 1 })
    expect(screen.queryByText('Your contribution')).not.toBeInTheDocument()
  })

  it('offers to submit a contribution once the volunteer has attended, tied to that attendance', async () => {
    const mock = mockApi(
      base({
        'GET /api/attendance': listBody([attended], 1, 1, 1),
        'POST /api/contributions': { status: 201, body: { contribution: contribution(1) } },
      })
    )
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Your contribution')).toBeInTheDocument()
    const textarea = await screen.findByLabelText('What did you do?')
    await userEvent.type(textarea, 'Helped serve meals to 40 families.')
    await userEvent.click(screen.getByRole('button', { name: /submit contribution/i }))

    expect(await screen.findByText('Pending review')).toBeInTheDocument()
    expect(screen.getByText(/awaiting admin review/i)).toBeInTheDocument()
    expect(mock.callsTo('POST /api/contributions')[0].body).toEqual({
      attendance: 'att1',
      description: 'Helped serve meals to 40 families.',
    })
  })

  it('requires a description before the submit button is enabled', async () => {
    mockApi(base({ 'GET /api/attendance': listBody([attended], 1, 1, 1) }))
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByRole('button', { name: /submit contribution/i })).toBeDisabled()
  })

  it('shows the existing contribution instead of a duplicate, when one already exists', async () => {
    let exists = false
    const mock = mockApi(
      base({
        'GET /api/attendance': listBody([attended], 1, 1, 1),
        'GET /api/contributions': () => (exists ? listBody([contribution(1)], 1, 1, 1) : emptyPage),
        'POST /api/contributions': () => {
          exists = true
          return { status: 409, body: { code: 'CONTRIBUTION_EXISTS', message: 'A contribution already exists for this attendance' } }
        },
      })
    )
    renderApp('/volunteer/activities/act1')
    const textarea = await screen.findByLabelText('What did you do?')
    await userEvent.type(textarea, 'Helped out.')
    await userEvent.click(screen.getByRole('button', { name: /submit contribution/i }))

    await waitFor(() => expect(screen.getByText('Pending review')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /submit contribution/i })).not.toBeInTheDocument()
    expect(mock.callsTo('POST /api/contributions')).toHaveLength(1)
  })

  it('lets the volunteer edit a PENDING contribution and shows the update afterwards', async () => {
    const mock = mockApi(
      base({
        'GET /api/attendance': listBody([attended], 1, 1, 1),
        'GET /api/contributions': listBody([contribution(1, { description: 'Original text.' })], 1, 1, 1),
        'PATCH /api/contributions/con1': { body: { contribution: contribution(1, { description: 'Revised text.', revision: 1 }) } },
      })
    )
    renderApp('/volunteer/activities/act1')
    await screen.findByText('Original text.')
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))

    const textarea = screen.getByLabelText('What did you do?')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Revised text.')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Revised text.')).toBeInTheDocument()
    expect(mock.callsTo('PATCH /api/contributions/con1')[0].body).toEqual({ description: 'Revised text.' })
    expect(screen.queryByText('Original text.')).not.toBeInTheDocument()
  })

  it('offers no edit control once VERIFIED, and shows the approved hours', async () => {
    mockApi(
      base({
        'GET /api/attendance': listBody([attended], 1, 1, 1),
        'GET /api/contributions': listBody(
          [contribution(1, { status: 'VERIFIED', approvedHours: 3, review: { reviewedAt: '2031-05-02T00:00:00Z', note: 'Nice work' } })],
          1,
          1,
          1
        ),
      })
    )
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Approved: 3h')).toBeInTheDocument()
    expect(screen.getByText('Nice work')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('offers no edit control once REJECTED, and shows the review note', async () => {
    mockApi(
      base({
        'GET /api/attendance': listBody([attended], 1, 1, 1),
        'GET /api/contributions': listBody(
          [contribution(1, { status: 'REJECTED', review: { reviewedAt: '2031-05-02T00:00:00Z', note: 'Not enough detail' } })],
          1,
          1,
          1
        ),
      })
    )
    renderApp('/volunteer/activities/act1')
    expect(await screen.findByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('Not approved')).toBeInTheDocument()
    expect(screen.getByText('Not enough detail')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })
})

describe('volunteer Contributions history page', () => {
  it('is in the volunteer navigation', async () => {
    mockApi({ ...signedIn, 'GET /api/contributions': emptyPage })
    renderApp('/volunteer/contributions')
    const nav = await screen.findByRole('navigation', { name: /volunteer navigation/i })
    expect(nav.querySelector('a[href="/volunteer/contributions"]')).toHaveTextContent('Contributions')
  })

  it('lists activity, description, status, dates, approved hours and the review note', async () => {
    const rows = [
      contribution(1, { status: 'VERIFIED', approvedHours: 4.5, review: { reviewedAt: '2031-05-02T00:00:00Z', note: 'Well done' }, updatedAt: '2031-05-02T00:00:00.000Z' }),
      contribution(2, { status: 'REJECTED', review: { reviewedAt: '2031-05-02T00:00:00Z', note: 'Too vague' } }),
      contribution(3, { status: 'PENDING' }),
    ]
    mockApi({ ...signedIn, 'GET /api/contributions': listBody(rows, 3, 1, 20) })
    renderApp('/volunteer/contributions')

    expect(await screen.findByRole('link', { name: 'Activity 1' })).toHaveAttribute('href', '/volunteer/activities/act1')
    expect(screen.getByText(rows[0].description)).toBeInTheDocument()
    expect(screen.getByText('Approved: 4.5h')).toBeInTheDocument()
    expect(screen.getByText('Well done')).toBeInTheDocument()
    expect(screen.getByText('Not approved')).toBeInTheDocument()
    expect(screen.getByText('Too vague')).toBeInTheDocument()
    expect(screen.getByText(/awaiting admin review/i)).toBeInTheDocument()
    expect(screen.getAllByText(/updated/i).length).toBeGreaterThan(0)
  })

  it('shows an empty state', async () => {
    mockApi({ ...signedIn, 'GET /api/contributions': listBody([], 0, 1, 20) })
    renderApp('/volunteer/contributions')
    expect(await screen.findByText('No contributions yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse activities/i })).toHaveAttribute('href', '/volunteer/activities')
  })

  it('shows an API error with a working retry', async () => {
    let calls = 0
    mockApi({ ...signedIn, 'GET /api/contributions': () => (++calls === 1 ? { status: 500, body: { message: 'Boom' } } : listBody([contribution(1)], 1, 1, 20)) })
    renderApp('/volunteer/contributions')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('link', { name: 'Activity 1' })).toBeInTheDocument()
  })

  it('is not available to admins', async () => {
    const mock = mockApi({ 'GET /api/auth/me': { body: { user: adminUser } } })
    renderApp('/volunteer/contributions')
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument()
    expect(mock.callsTo('GET /api/contributions')).toHaveLength(0)
  })
})

describe('statistics come from the API, not a local count', () => {
  it('renders activitiesAttended, verifiedActivities and verifiedHours from the volunteer stats endpoint', async () => {
    const profile = { ...volunteerUser.volunteer, email: volunteerUser.email }
    const mock = mockApi({
      ...signedIn,
      'GET /api/volunteers/me': { body: { volunteer: profile, stats: { activitiesAttended: 4, verifiedActivities: 3, verifiedHours: 7.25 } } },
    })
    renderApp('/volunteer')
    expect(await screen.findByText('7.25h')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(mock.callsTo('GET /api/contributions')).toHaveLength(0)
  })
})
