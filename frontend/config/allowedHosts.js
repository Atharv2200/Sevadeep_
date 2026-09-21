// Extra hostnames the Vite dev/preview server may answer to, from VITE_ALLOWED_HOSTS
// (comma-separated). Vite refuses requests whose Host header it does not recognise, which
// is what stops a tunnel (Cloudflare Tunnel, ngrok) from reaching the app during phone
// testing. Each entry is an exact hostname ("demo.example.org") or a suffix starting with
// a dot (".trycloudflare.com"). Anything broader is refused: host validation is never
// switched off, only widened to the names listed.
const HOST = /^\.?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i

export function parseAllowedHosts(value) {
  if (value === undefined || value.trim() === '') return undefined
  const hosts = value.split(',').map((entry) => entry.trim()).filter(Boolean)
  for (const host of hosts) {
    // Real domain names have a dot; a bare label ("true") or a top-level suffix (".com",
    // which would allow nearly everything) is refused.
    if (!HOST.test(host) || !host.replace(/^\./, '').includes('.')) {
      throw new Error(
        `Invalid VITE_ALLOWED_HOSTS entry "${host}": use a hostname such as demo.example.org or a suffix such as .trycloudflare.com.`
      )
    }
  }
  return hosts
}
