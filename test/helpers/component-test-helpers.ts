/**
 * Component Test Helpers
 * 
 * Utilities for React component testing
 * Follows patterns from components/chat/__tests__/chat-components.test.tsx
 */

import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

/**
 * Render component with required providers
 * Wraps component with MemoryRouter and other necessary providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter>
        {children}
      </MemoryRouter>
    ),
    ...options
  })
}

/**
 * Mock browser APIs for component tests
 */
export function setupBrowserMocks() {
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn()

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() { return [] }
    unobserve() {}
  } as any

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any
}

/**
 * Create mock service refs for App.tsx testing
 */
export function createMockServiceRefs() {
  return {
    standardChatRef: { current: { sendMessage: vi.fn() } },
    liveServiceRef: { current: { sendRealtimeMedia: vi.fn(), sendText: vi.fn() } },
    aiBrainRef: { current: { chat: vi.fn() } },
    researchServiceRef: { current: {} }
  }
}

/**
 * Create mock transcript items
 */
export function createMockTranscriptItem(overrides: Partial<any> = {}) {
  return {
    id: Date.now().toString(),
    role: 'user' as const,
    text: 'Test message',
    timestamp: new Date(),
    isFinal: true,
    status: 'complete' as const,
    ...overrides
  }
}
