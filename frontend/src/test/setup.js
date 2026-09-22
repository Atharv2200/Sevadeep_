import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom does not implement IntersectionObserver (framer-motion's whileInView needs it).
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
window.IntersectionObserver = IntersectionObserverStub

// jsdom does not implement scrolling.
Element.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}

// jsdom does not implement object URLs (used for local photo previews).
let objectUrlCount = 0
window.URL.createObjectURL = () => `blob:test-${(objectUrlCount += 1)}`
window.URL.revokeObjectURL = () => {}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
})
