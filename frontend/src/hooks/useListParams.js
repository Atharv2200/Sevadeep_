import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const SEARCH_DELAY_MS = 300

// URL-driven list state (?search=&page=&<filters>), so a refresh, the back button and
// shared links keep the same view. `filters` names the extra query parameters.
// Typing in the search box is debounced into the URL, and the box follows the URL
// when it changes from outside.
export function useListParams(filters = []) {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const requestedPage = Number(params.get('page'))
  const page = Number.isInteger(requestedPage) && requestedPage > 1 ? requestedPage : 1
  const values = Object.fromEntries(filters.map((name) => [name, params.get(name) ?? '']))

  // Changing anything but the page returns to page 1.
  const update = (changes) => {
    const next = new URLSearchParams(params)
    const resetsPage = !('page' in changes)
    for (const [key, value] of Object.entries(changes)) {
      if (value && !(key === 'page' && value === 1)) next.set(key, String(value))
      else next.delete(key)
    }
    if (resetsPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const [text, setText] = useState(search)
  useEffect(() => setText(search), [search])
  useEffect(() => {
    if (text === search) return undefined
    const timer = setTimeout(() => update({ search: text.trim() === '' ? '' : text }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
    // `update` is recreated every render; only the typed text and the applied search matter here.
  }, [text, search])

  return { search, page, values, text, setText, update, filtered: Boolean(search || Object.values(values).some(Boolean)) }
}
