import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocationError, getPosition } from './geolocation'

function stubGeolocation(impl) {
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: vi.fn(impl) } })
  return navigator.geolocation.getCurrentPosition
}

afterEach(() => {
  vi.stubGlobal('isSecureContext', true)
})

describe('getPosition', () => {
  it('resolves latitude, longitude and accuracy from a fresh high-accuracy fix', async () => {
    const spy = stubGeolocation((ok) => ok({ coords: { latitude: 18.5, longitude: 73.8, accuracy: 14, altitude: 3 } }))
    expect(await getPosition()).toEqual({ latitude: 18.5, longitude: 73.8, accuracy: 14 })
    expect(spy.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 })
  })

  it.each([
    [1, 'DENIED'],
    [2, 'UNAVAILABLE'],
    [3, 'TIMEOUT'],
    [99, 'UNAVAILABLE'],
  ])('classifies browser error code %s as %s', async (code, kind) => {
    stubGeolocation((ok, fail) => fail({ code }))
    await expect(getPosition()).rejects.toMatchObject({ name: 'LocationError', kind })
  })

  it('reports a browser without geolocation', async () => {
    vi.stubGlobal('navigator', {})
    await expect(getPosition()).rejects.toMatchObject({ kind: 'UNSUPPORTED' })
  })

  it('reports an insecure page without asking the browser', async () => {
    const spy = stubGeolocation(() => {})
    vi.stubGlobal('isSecureContext', false)
    await expect(getPosition()).rejects.toBeInstanceOf(LocationError)
    expect(spy).not.toHaveBeenCalled()
  })

  it('gives every failure a message a volunteer can act on', async () => {
    stubGeolocation((ok, fail) => fail({ code: 1 }))
    await expect(getPosition()).rejects.toThrow(/allow location/i)
  })
})
