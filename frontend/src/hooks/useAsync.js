import { useCallback, useEffect, useState } from 'react'

// Runs `load(signal)` on mount and whenever `deps` change, and exposes
// { data, error, loading, reload }. A stale response (deps changed, component
// unmounted) is discarded. Previous data stays visible while a reload is in flight.
export function useAsync(load, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((previous) => ({ ...previous, error: null, loading: true }))

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false })
      },
      (error) => {
        if (!controller.signal.aborted) setState({ data: null, error, loading: false })
      }
    )

    return () => controller.abort()
    // `load` is intentionally not a dependency: callers list what should trigger a reload.
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}
