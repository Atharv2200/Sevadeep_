import { describe, expect, it } from 'vitest'
import { safeNext } from './safeNext'

const FALLBACK = '/volunteer'

describe('safeNext', () => {
  it.each([
    ['/volunteer', '/volunteer'],
    ['/attend/abc123?t=token', '/attend/abc123?t=token'],
    ['/admin/volunteers?search=a&page=2#top', '/admin/volunteers?search=a&page=2#top'],
    ['/', '/'],
  ])('accepts the in-app path %s', (input, expected) => {
    expect(safeNext(input, FALLBACK)).toBe(expected)
  })

  it.each([
    ['another origin', 'https://evil.example/steal'],
    ['protocol-relative', '//evil.example'],
    ['protocol-relative with path', '//evil.example/a'],
    ['backslash host', '/\\evil.example'],
    ['backslash anywhere', '/ok\\path'],
    ['tab hidden in //', '/\t/evil.example'],
    ['newline hidden in //', '/\n/evil.example'],
    ['control character', '/a\u0000b'],
    ['javascript url', 'javascript:alert(1)'],
    ['data url', 'data:text/html,<script>alert(1)</script>'],
    ['relative path', 'volunteer'],
    ['empty string', ''],
    ['not a string', undefined],
    ['array', ['/a']],
    ['object', { toString: () => '/a' }],
  ])('rejects %s', (_label, input) => {
    expect(safeNext(input, FALLBACK)).toBe(FALLBACK)
  })

  it('defaults the fallback to the home page', () => {
    expect(safeNext('//evil.example')).toBe('/')
  })

  it('returns the normalised path, never the raw input', () => {
    expect(safeNext('/a/../b')).toBe('/b')
  })
})
