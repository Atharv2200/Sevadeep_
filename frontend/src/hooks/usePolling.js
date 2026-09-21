import { useCallback, useEffect, useRef, useState } from 'react'

// Statuses that will not fix themselves: polling stops instead of hammering the API.
const FATAL_STATUSES = new Set([401, 403, 404])

// Runs `load(signal)` now and again every `intervalMs`, and exposes
// { data, error, loading, updatedAt, reload }. Deliberately plain polling (no
// WebSockets in v1):
//   - requests never overlap: the next one is scheduled when the last one finishes;
//   - it pauses while the tab is hidden and refreshes as soon as it is visible again;
//   - a failed refresh keeps the last good data (callers can show it as stale);
//   - it stops for 401/403/404, and when the component unmounts or `deps` change.
export function usePolling(load, { intervalMs = 10000, deps = [] } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null })
  const loadRef = useRef(load)
  loadRef.current = load
  const runRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let timer = null
    let inFlight = false
    let skipped = false

    setState({ data: null, error: null, loading: true, updatedAt: null })

    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(tick, intervalMs)
    }

    const run = async () => {
      if (inFlight || signal.aborted) return
      inFlight = true
      skipped = false
      let fatal = false
      try {
        const data = await loadRef.current(signal)
        if (!signal.aborted) setState({ data, error: null, loading: false, updatedAt: new Date() })
      } catch (error) {
        if (signal.aborted) return
        fatal = FATAL_STATUSES.has(error.status)
        setState((previous) => ({ ...previous, error, loading: false }))
      } finally {
        inFlight = false
        if (!signal.aborted && !fatal) schedule()
      }
    }

    function tick() {
      if (document.hidden) {
        skipped = true
        schedule()
        return
      }
      run()
    }

    const onVisible = () => {
      if (!document.hidden && skipped) run()
    }

    runRef.current = run
    document.addEventListener('visibilitychange', onVisible)
    run()

    return () => {
      controller.abort()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // `load` is read through a ref: callers list what should restart polling.
  }, [...deps, intervalMs])

  const reload = useCallback(() => runRef.current?.(), [])
  return { ...state, reload }
}
