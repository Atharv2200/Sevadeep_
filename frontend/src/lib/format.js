const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

// The server sends UTC ISO timestamps; they are shown in the viewer's local time.
export function formatDate(iso) {
  return iso ? dateFormat.format(new Date(iso)) : '—'
}

export function formatDateTime(iso) {
  return iso ? dateTimeFormat.format(new Date(iso)) : 'Never'
}

// 12 -> "12h", 12.5 -> "12.5h", 0.25 -> "0.25h"
export function formatHours(hours) {
  return `${Number(hours.toFixed(2))}h`
}

// 500 -> "500 B", 5242880 -> "5 MB"
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${Number(value.toFixed(1))} ${units[unit]}`
}

const weekdayDateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

// "Sat, 4 Oct 2026, 9:00 AM – 12:00 PM", or both full date-times when it spans days.
export function formatActivityTime(startsAt, endsAt) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (start.toDateString() === end.toDateString()) {
    return `${weekdayDateFormat.format(start)}, ${timeFormat.format(start)} – ${timeFormat.format(end)}`
  }
  return `${dateTimeFormat.format(start)} – ${dateTimeFormat.format(end)}`
}

const pad = (n) => String(n).padStart(2, '0')

// <input type="datetime-local"> works in the viewer's local time without a zone;
// the API takes UTC ISO strings. These two convert between them.
export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
