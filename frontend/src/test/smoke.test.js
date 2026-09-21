import { describe, expect, it } from 'vitest'

describe('test tooling', () => {
  it('runs in a jsdom environment', () => {
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement)
  })
})
