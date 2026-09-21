// A promise wrapper around the browser's geolocation, with failures classified so a
// page can tell the volunteer what to do. It only reports what the device says; whether
// that position is acceptable is decided by the server.

export class LocationError extends Error {
  constructor(kind, message) {
    super(message)
    this.name = 'LocationError'
    // UNSUPPORTED | INSECURE | DENIED | UNAVAILABLE | TIMEOUT
    this.kind = kind
  }
}

const MESSAGES = {
  UNSUPPORTED: "This browser can't share your location. Try another browser.",
  INSECURE: 'Location is only available on secure (https) pages. Open the link from the QR code again.',
  DENIED: 'Location access is blocked. Allow location for this site in your browser settings, then try again.',
  UNAVAILABLE: "Your device couldn't work out where you are. Move to an open area and try again.",
  TIMEOUT: 'Finding your location took too long. Move to an open area and try again.',
}

const CODE_TO_KIND = { 1: 'DENIED', 2: 'UNAVAILABLE', 3: 'TIMEOUT' }

// Resolves { latitude, longitude, accuracy } (metres) from a fresh, high-accuracy fix.
export function getPosition({ timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new LocationError('UNSUPPORTED', MESSAGES.UNSUPPORTED))
      return
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reject(new LocationError('INSECURE', MESSAGES.INSECURE))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      (error) => {
        const kind = CODE_TO_KIND[error?.code] ?? 'UNAVAILABLE'
        reject(new LocationError(kind, MESSAGES[kind]))
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    )
  })
}
