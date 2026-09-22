import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContributionPhotos from './ContributionPhotos'
import { contributionPhoto } from '../../test/fixtures'
import { mockApi } from '../../test/mockFetch'

const jpeg = (name = 'a.jpg') => new File(['x'.repeat(100)], name, { type: 'image/jpeg' })
const oversized = (name = 'big.jpg') => new File([new Uint8Array(5 * 1024 * 1024 + 1)], name, { type: 'image/jpeg' })
const unsupported = (name = 'a.gif') => new File(['x'], name, { type: 'image/gif' })

function StagedHarness() {
  const [staged, setStaged] = useState([])
  return <ContributionPhotos mode="staged" staged={staged} onStagedChange={setStaged} />
}

describe('ContributionPhotos: staged (pre-creation) mode', () => {
  it('previews selected photos and lets the volunteer remove one before submitting', async () => {
    render(<StagedHarness />)
    const input = screen.getByLabelText('Add photos')

    await userEvent.upload(input, [jpeg('a.jpg'), jpeg('b.jpg')])
    expect(screen.getAllByRole('img', { name: 'Selected photo' })).toHaveLength(2)

    await userEvent.click(screen.getAllByRole('button', { name: /remove photo/i })[0])
    expect(screen.getAllByRole('img', { name: 'Selected photo' })).toHaveLength(1)
  })

  it('rejects an unsupported file type with a readable message', async () => {
    render(<StagedHarness />)
    // The browser's own accept-attribute filtering would normally keep a .gif out of
    // the picker; this simulates someone bypassing it (drag-and-drop, a renamed file).
    await userEvent.upload(screen.getByLabelText('Add photos'), unsupported(), { applyAccept: false })
    expect(await screen.findByText(/unsupported file type/i)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Selected photo' })).not.toBeInTheDocument()
  })

  it('rejects a file over the size limit with a readable message', async () => {
    render(<StagedHarness />)
    await userEvent.upload(screen.getByLabelText('Add photos'), oversized())
    expect(await screen.findByText(/too large/i)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Selected photo' })).not.toBeInTheDocument()
  })

  it('caps selection at 5 photos total, accepting only what still fits', async () => {
    render(<StagedHarness />)
    const input = screen.getByLabelText('Add photos')
    await userEvent.upload(input, [jpeg('1.jpg'), jpeg('2.jpg'), jpeg('3.jpg'), jpeg('4.jpg'), jpeg('5.jpg')])
    expect(screen.getAllByRole('img', { name: 'Selected photo' })).toHaveLength(5)
    expect(screen.queryByLabelText('Add photos')).not.toBeInTheDocument()

    // No room left, so the picker (and therefore the input) is gone entirely.
    expect(screen.getAllByRole('img', { name: 'Selected photo' })).toHaveLength(5)
  })

  it('reports how many more photos would fit when a selection overflows the limit', async () => {
    function Harness() {
      const [staged, setStaged] = useState([1, 2, 3, 4].map((n) => ({ file: jpeg(`${n}.jpg`), previewUrl: `blob:${n}` })))
      return <ContributionPhotos mode="staged" staged={staged} onStagedChange={setStaged} />
    }
    render(<Harness />)
    await userEvent.upload(screen.getByLabelText('Add photos'), [jpeg('5.jpg'), jpeg('6.jpg')])
    expect(await screen.findByText(/only 1 more photo/i)).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Selected photo' })).toHaveLength(5)
  })
})

describe('ContributionPhotos: readonly mode', () => {
  it('renders nothing when there are no photos', () => {
    const { container } = render(<ContributionPhotos mode="readonly" photos={[]} photoUrlFor={() => '#'} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('displays uploaded photos with no add or remove controls', () => {
    const photos = [contributionPhoto(1), contributionPhoto(2)]
    render(<ContributionPhotos mode="readonly" photos={photos} photoUrlFor={(id) => `/api/contributions/con1/photos/${id}`} />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', '/api/contributions/con1/photos/photo1')
    expect(screen.queryByRole('button', { name: /remove photo/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Add photos')).not.toBeInTheDocument()
  })
})

describe('ContributionPhotos: manage mode', () => {
  it('uploads newly picked photos immediately and reports the updated contribution', async () => {
    const mock = mockApi({
      'POST /api/contributions/con1/photos': {
        status: 201,
        body: { contribution: { id: 'con1', photos: [contributionPhoto(1)] } },
      },
    })
    const onChange = vi.fn()
    render(
      <ContributionPhotos
        mode="manage"
        photos={[]}
        photoUrlFor={(id) => `/api/contributions/con1/photos/${id}`}
        contributionId="con1"
        onChange={onChange}
      />
    )

    await userEvent.upload(screen.getByLabelText('Add photos'), jpeg('a.jpg'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ id: 'con1', photos: [contributionPhoto(1)] }))
    expect(mock.callsTo('POST /api/contributions/con1/photos')).toHaveLength(1)
  })

  it('removes an uploaded photo immediately and reports the updated contribution', async () => {
    const mock = mockApi({
      'DELETE /api/contributions/con1/photos/photo1': { body: { contribution: { id: 'con1', photos: [] } } },
    })
    const onChange = vi.fn()
    render(
      <ContributionPhotos
        mode="manage"
        photos={[contributionPhoto(1)]}
        photoUrlFor={(id) => `/api/contributions/con1/photos/${id}`}
        contributionId="con1"
        onChange={onChange}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /remove photo/i }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ id: 'con1', photos: [] }))
    expect(mock.callsTo('DELETE /api/contributions/con1/photos/photo1')).toHaveLength(1)
  })

  it('hides the add control once 5 photos are already uploaded', () => {
    const photos = [1, 2, 3, 4, 5].map((n) => contributionPhoto(n))
    render(<ContributionPhotos mode="manage" photos={photos} photoUrlFor={(id) => `#${id}`} contributionId="con1" onChange={() => {}} />)
    expect(screen.queryByLabelText('Add photos')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /remove photo/i })).toHaveLength(5)
  })
})
