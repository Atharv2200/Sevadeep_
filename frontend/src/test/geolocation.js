import { vi } from 'vitest'

// Replaces navigator.geolocation for one test. `behaviour` is called with
// (success, failure) like the real API and decides how the position resolves.
export function stubGeolocation(behaviour) {
  const getCurrentPosition = vi.fn(behaviour)
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
  return getCurrentPosition
}

export const fix = (latitude = 18.5204, longitude = 73.8567, accuracy = 12) => ({ coords: { latitude, longitude, accuracy } })

export const positionFound = (coords = fix()) => stubGeolocation((ok) => ok(coords))
export const positionFails = (code) => stubGeolocation((ok, fail) => fail({ code }))

export function removeGeolocation() {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
}
