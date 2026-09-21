import { describe, expect, it } from 'vitest'
import { formatActivityTime, fromLocalInput, toLocalInput } from './format'

describe('datetime-local conversion', () => {
  it('round-trips through the local zone', () => {
    const iso = '2026-10-04T09:30:00.000Z'
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso)
  })

  it('renders local wall-clock time without a zone', () => {
    const local = new Date(2026, 9, 4, 7, 5)
    expect(toLocalInput(local.toISOString())).toBe('2026-10-04T07:05')
    expect(fromLocalInput('2026-10-04T07:05')).toBe(local.toISOString())
  })

  it('handles empty and invalid values', () => {
    expect(toLocalInput('')).toBe('')
    expect(toLocalInput(null)).toBe('')
    expect(fromLocalInput('')).toBeNull()
    expect(fromLocalInput('garbage')).toBeNull()
  })
})

describe('formatActivityTime', () => {
  it('shows the date once for a same-day activity', () => {
    const text = formatActivityTime(new Date(2026, 9, 4, 9, 0).toISOString(), new Date(2026, 9, 4, 12, 0).toISOString())
    expect(text.match(/2026/g)).toHaveLength(1)
    expect(text).toContain('–')
  })

  it('shows both dates when it spans days', () => {
    const text = formatActivityTime(new Date(2026, 9, 4, 9, 0).toISOString(), new Date(2026, 9, 5, 12, 0).toISOString())
    expect(text.match(/2026/g)).toHaveLength(2)
  })
})
