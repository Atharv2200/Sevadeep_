import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePolling } from './usePolling'

const INTERVAL = 10000
const tick = (ms = INTERVAL) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  setHidden(false)
  vi.useRealTimers()
})

describe('usePolling', () => {
  it('loads immediately and then every interval', async () => {
    const load = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b').mockResolvedValue('c')
    const { result } = renderHook(() => usePolling(load, { intervalMs: INTERVAL }))
    expect(result.current.loading).toBe(true)

    await tick(0)
    expect(result.current).toMatchObject({ data: 'a', loading: false, error: null })
    expect(load).toHaveBeenCalledTimes(1)

    await tick()
    expect(result.current.data).toBe('b')
    await tick()
    expect(result.current.data).toBe('c')
    expect(load).toHaveBeenCalledTimes(3)
    expect(result.current.updatedAt).toBeInstanceOf(Date)
  })

  it('never overlaps requests: the next is scheduled after the last one finishes', async () => {
    let finish
    const load = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    renderHook(() => usePolling(load, { intervalMs: INTERVAL }))
    await tick(0)
    await tick(INTERVAL * 3)
    expect(load).toHaveBeenCalledTimes(1)

    await act(async () => finish('x'))
    await tick()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('keeps the last good data when a refresh fails, and recovers', async () => {
    const boom = Object.assign(new Error('offline'), { status: 0 })
    const load = vi.fn().mockResolvedValueOnce('good').mockRejectedValueOnce(boom).mockResolvedValue('better')
    const { result } = renderHook(() => usePolling(load, { intervalMs: INTERVAL }))
    await tick(0)
    await tick()
    expect(result.current).toMatchObject({ data: 'good', error: boom })
    await tick()
    expect(result.current).toMatchObject({ data: 'better', error: null })
  })

  it.each([401, 403, 404])('stops polling after a %s', async (status) => {
    const load = vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { status }))
    const { result } = renderHook(() => usePolling(load, { intervalMs: INTERVAL }))
    await tick(0)
    await tick(INTERVAL * 5)
    expect(load).toHaveBeenCalledTimes(1)
    expect(result.current.error.status).toBe(status)
  })

  it('pauses while the tab is hidden and refreshes as soon as it is visible', async () => {
    const load = vi.fn().mockResolvedValue('x')
    renderHook(() => usePolling(load, { intervalMs: INTERVAL }))
    await tick(0)
    expect(load).toHaveBeenCalledTimes(1)

    act(() => setHidden(true))
    await tick(INTERVAL * 4)
    expect(load).toHaveBeenCalledTimes(1)

    await act(async () => setHidden(false))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('stops on unmount and aborts the request in flight', async () => {
    let signal
    const load = vi.fn((s) => { signal = s; return new Promise(() => {}) })
    const { unmount } = renderHook(() => usePolling(load, { intervalMs: INTERVAL }))
    await tick(0)
    unmount()
    expect(signal.aborted).toBe(true)
    await tick(INTERVAL * 3)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('restarts when its dependencies change, discarding the old data', async () => {
    const load = vi.fn(async () => 'x')
    const { result, rerender } = renderHook(({ id }) => usePolling(load, { intervalMs: INTERVAL, deps: [id] }), { initialProps: { id: 1 } })
    await tick(0)
    expect(result.current.data).toBe('x')
    rerender({ id: 2 })
    expect(result.current.data).toBeNull()
    await tick(0)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('reload fetches now', async () => {
    const load = vi.fn().mockResolvedValue('x')
    const { result } = renderHook(() => usePolling(load, { intervalMs: INTERVAL }))
    await tick(0)
    await act(async () => result.current.reload())
    expect(load).toHaveBeenCalledTimes(2)
  })
})
