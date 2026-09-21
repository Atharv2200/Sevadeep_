// Validates a post-login redirect target taken from the URL (?next=...).
// Only an absolute path inside this app is accepted; anything that could leave
// the site (other origins, protocol-relative //host, backslashes, control
// characters that browsers strip and thereby turn "/\t/host" into "//host")
// falls back to `fallback`.
export function safeNext(value, fallback = '/') {
  if (typeof value !== 'string' || value === '') return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return fallback

  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
