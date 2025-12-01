// Test setup file for Vitest
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Provide jest alias for tests that still reference jest.fn
(globalThis as any).jest = vi

// Mock global fetch
global.fetch = vi.fn()

// Mock import.meta.env for Vite
if (typeof globalThis !== 'undefined') {
  const mergedEnv = {
    DEV: false,
    PROD: true,
    VITE_AGENT_API_URL: 'http://localhost:3002/api/chat'
  }

  // Ensure the property exists and is writable for test reassignment
  Object.defineProperty(globalThis as any, 'import', {
    value: {
      meta: {
        env: mergedEnv
      }
    },
    writable: true,
    configurable: true
  })

  // Provide the direct alias used by some tests: globalThis.import.meta
  ;(globalThis as any).import.meta = (globalThis as any).import.meta || { env: mergedEnv }
}

// Mock window object for browser APIs
if (typeof window === 'undefined') {
  ;(globalThis as any).window = globalThis
}

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Configure test timeouts
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 10000
})

// Mock IntersectionObserver for React components
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return [] }
  unobserve() {}
} as any

// Mock ResizeObserver for React components
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Cleanup after each test
afterEach(() => {
  cleanup()
})

