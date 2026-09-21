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
