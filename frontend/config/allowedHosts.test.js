import { describe, expect, it } from 'vitest'
import { parseAllowedHosts } from './allowedHosts'

describe('parseAllowedHosts', () => {
  it('leaves Vite\'s own defaults alone when nothing is configured', () => {
    expect(parseAllowedHosts(undefined)).toBeUndefined()
    expect(parseAllowedHosts('')).toBeUndefined()
    expect(parseAllowedHosts('   ')).toBeUndefined()
  })

  it('accepts exact hostnames and dotted suffixes, trimmed', () => {
    expect(parseAllowedHosts('demo.example.org, .trycloudflare.com ,.ngrok-free.app')).toEqual([
      'demo.example.org',
      '.trycloudflare.com',
      '.ngrok-free.app',
    ])
  })

  it.each(['*', 'true', 'https://demo.example.org', 'demo.example.org/path', 'demo example.org', '.com', '.', '..example.org', 'a_b.example.org', ':5173'])(
    'refuses %s',
    (entry) => {
      expect(() => parseAllowedHosts(entry)).toThrow(/VITE_ALLOWED_HOSTS/)
    }
  )

  it('refuses the whole list if any entry is bad', () => {
    expect(() => parseAllowedHosts('demo.example.org,*')).toThrow()
  })
})
