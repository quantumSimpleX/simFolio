import '@testing-library/jest-dom/vitest'
import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { __reset } from './supabaseMock'

// jsdom lacks these browser APIs used by charts and breakpoint hooks
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub

window.matchMedia = window.matchMedia || ((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}))

window.scrollTo = window.scrollTo || (() => {})
window.alert = vi.fn()
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {})

// No real network in tests: external quote APIs return empty payloads
globalThis.fetch = vi.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
}))

afterEach(() => {
  cleanup()
  __reset()
  localStorage.clear()
})
