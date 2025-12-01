/**
 * Session Coordinator Tests
 *
 * Tests the session ID coordination functions to ensure consistent
 * session ID extraction and normalization across client and server.
 */

import {
  normalizeSessionId,
  getSessionIdFromRequest,
  getOrCreateClientSessionId,
  withSessionHeaders,
  SESSION_HEADER,
  LEGACY_SESSION_HEADER,
  SESSION_COOKIE,
  SESSION_QUERY
} from '../session-coordinator'
import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('normalizeSessionId', () => {
  it('should return trimmed session ID if provided', () => {
    expect(normalizeSessionId('  test-session-123  ')).toBe('test-session-123')
    expect(normalizeSessionId('sess_abc123')).toBe('sess_abc123')
  })

  it('should generate new session ID if empty/null/undefined', () => {
    const id1 = normalizeSessionId('')
    const id2 = normalizeSessionId(null)
    const id3 = normalizeSessionId(undefined)

    expect(id1).toMatch(/^sess_/)
    expect(id2).toMatch(/^sess_/)
    expect(id3).toMatch(/^sess_/)
    expect(id1).not.toBe(id2)
    expect(id2).not.toBe(id3)
  })

  it('should handle whitespace-only strings', () => {
    const id = normalizeSessionId('   ')
    expect(id).toMatch(/^sess_/)
  })
})

describe('getSessionIdFromRequest', () => {
  it('should extract session ID from query parameter', () => {
    const req = new NextRequest('http://localhost:3000/api/chat?sessionId=query-session-123')
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('query-session-123')
  })

  it('should extract session ID from x-intelligence-session-id header', () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: {
        [SESSION_HEADER]: 'header-session-123'
      }
    })
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('header-session-123')
  })

  it('should fallback to legacy x-session-id header', () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: {
        [LEGACY_SESSION_HEADER]: 'legacy-session-123'
      }
    })
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('legacy-session-123')
  })

  it('should extract session ID from cookie', () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: {
        Cookie: `${SESSION_COOKIE}=cookie-session-123`
      }
    })
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('cookie-session-123')
  })

  it('should prioritize query > header > cookie', () => {
    const req = new NextRequest('http://localhost:3000/api/chat?sessionId=query-123', {
      headers: {
        [SESSION_HEADER]: 'header-123',
        Cookie: `${SESSION_COOKIE}=cookie-123`
      }
    })
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('query-123')
  })

  it('should prioritize new header over legacy header', () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: {
        [SESSION_HEADER]: 'new-header-123',
        [LEGACY_SESSION_HEADER]: 'legacy-header-123'
      }
    })
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('new-header-123')
  })

  it('should return empty string if no session ID found', () => {
    const req = new NextRequest('http://localhost:3000/api/chat')
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('')
  })

  it('should handle URL encoding in query params', () => {
    const encoded = encodeURIComponent('session with spaces')
    const req = new NextRequest(`http://localhost:3000/api/chat?sessionId=${encoded}`)
    const sessionId = getSessionIdFromRequest(req)
    expect(sessionId).toBe('session with spaces')
  })
})

describe('getOrCreateClientSessionId', () => {
  // Mock window and localStorage
  const mockLocalStorage = new Map<string, string>()

  // Store originals
  const originalWindow = global.window
  const originalDocument = global.document
  let originalLocation: Location | undefined

  beforeEach(() => {
    mockLocalStorage.clear()

    // Setup window if missing
    if (!global.window) {
      global.window = Object.create(null)
    }

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockLocalStorage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        mockLocalStorage.delete(key)
      }),
      clear: vi.fn(() => {
        mockLocalStorage.clear()
      }),
      length: mockLocalStorage.size,
      key: vi.fn((index: number) => Array.from(mockLocalStorage.keys())[index] || null)
    }

    try {
      Object.defineProperty(global.window, 'localStorage', {
        value: localStorageMock,
        writable: true
      })
    } catch (e) {
      // Fallback if defineProperty fails
      // @ts-ignore
      global.window.localStorage = localStorageMock
    }

    // Mock location
    // @ts-ignore
    originalLocation = global.window.location
    // @ts-ignore
    delete global.window.location
    // @ts-ignore
    global.window.location = {
      href: 'http://localhost:3000/live',
      search: ''
    }

    // Mock document
    if (!global.document) {
      global.document = Object.create(null)
    }

    try {
      Object.defineProperty(global.document, 'cookie', {
        value: '',
        writable: true
      })
    } catch (e) {
      // @ts-ignore
      global.document.cookie = ''
    }
  })

  afterEach(() => {
    // Restore location
    if (global.window && originalLocation) {
      // @ts-ignore
      global.window.location = originalLocation
    }

    // Restore globals if we replaced them entirely (unlikely with this approach but good for safety)
    if (originalWindow) {
      global.window = originalWindow
    }
    if (originalDocument) {
      global.document = originalDocument
    }
  })

  it('should return existing session ID from localStorage', () => {
    mockLocalStorage.set(SESSION_COOKIE, 'stored-session-123')

    const sessionId = getOrCreateClientSessionId()

    expect(sessionId).toBe('stored-session-123')
  })

  it.skip('should return session ID from URL query parameter', () => {
    // Mock URL with query param
    // @ts-ignore
    global.window.location.href = 'http://localhost:3000/live?sessionId=query-session-123'
    // @ts-ignore
    global.window.location.search = '?sessionId=query-session-123'

    const sessionId = getOrCreateClientSessionId()

    expect(sessionId).toBe('query-session-123')
    expect(mockLocalStorage.get(SESSION_COOKIE)).toBe('query-session-123')
  })

  it.skip('should prioritize query > localStorage > cookie', () => {
    mockLocalStorage.set(SESSION_COOKIE, 'stored-session-123')

    // @ts-ignore
    global.window.location.href = 'http://localhost:3000/live?sessionId=query-session-123'
    // @ts-ignore
    global.window.location.search = '?sessionId=query-session-123'

    const sessionId = getOrCreateClientSessionId()

    expect(sessionId).toBe('query-session-123')
  })

  it('should generate new session ID if none found', () => {
    const sessionId = getOrCreateClientSessionId()

    expect(sessionId).toMatch(/^sess_/)
    expect(mockLocalStorage.get(SESSION_COOKIE)).toBe(sessionId)
  })

  it('should persist generated session ID to localStorage', () => {
    const sessionId = getOrCreateClientSessionId()

    expect(mockLocalStorage.get(SESSION_COOKIE)).toBe(sessionId)
  })

  it('should return generated ID in SSR context (no window)', () => {
    // @ts-ignore
    delete global.window

    const sessionId = getOrCreateClientSessionId()

    expect(sessionId).toMatch(/^sess_/)
  })
})

describe('withSessionHeaders', () => {
  // Mock window and localStorage
  const mockLocalStorage = new Map<string, string>()

  // Store originals
  const originalWindow = global.window
  const originalDocument = global.document
  let originalLocation: Location | undefined

  beforeEach(() => {
    mockLocalStorage.clear()

    // Setup window if missing
    if (!global.window) {
      global.window = Object.create(null)
    }

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockLocalStorage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        mockLocalStorage.delete(key)
      }),
      clear: vi.fn(() => {
        mockLocalStorage.clear()
      }),
      length: mockLocalStorage.size,
      key: vi.fn((index: number) => Array.from(mockLocalStorage.keys())[index] || null)
    }

    try {
      Object.defineProperty(global.window, 'localStorage', {
        value: localStorageMock,
        writable: true
      })
    } catch (e) {
      // Fallback
      // @ts-ignore
      global.window.localStorage = localStorageMock
    }

    // Mock location
    // @ts-ignore
    originalLocation = global.window.location
    // @ts-ignore
    delete global.window.location
    // @ts-ignore
    global.window.location = {
      href: 'http://localhost:3000/live',
      search: ''
    }

    // Mock document
    if (!global.document) {
      global.document = Object.create(null)
    }

    try {
      Object.defineProperty(global.document, 'cookie', {
        value: '',
        writable: true
      })
    } catch (e) {
      // @ts-ignore
      global.document.cookie = ''
    }
  })

  afterEach(() => {
    // Restore location
    if (global.window && originalLocation) {
      // @ts-ignore
      global.window.location = originalLocation
    }

    if (originalWindow) {
      global.window = originalWindow
    }
    if (originalDocument) {
      global.document = originalDocument
    }
  })

  it('should add session headers to request init', () => {
    mockLocalStorage.set(SESSION_COOKIE, 'test-session-123')

    const init = withSessionHeaders({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const headers = init.headers as Headers
    expect(headers.get(SESSION_HEADER)).toBe('test-session-123')
    expect(headers.get(LEGACY_SESSION_HEADER)).toBe('test-session-123')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('should preserve existing headers', () => {
    mockLocalStorage.set(SESSION_COOKIE, 'test-session-123')

    const init = withSessionHeaders({
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123'
      })
    })

    const headers = init.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer token123')
    expect(headers.get(SESSION_HEADER)).toBe('test-session-123')
  })

  it('should work with empty init', () => {
    mockLocalStorage.set(SESSION_COOKIE, 'test-session-123')

    const init = withSessionHeaders()

    const headers = init.headers as Headers
    expect(headers.get(SESSION_HEADER)).toBe('test-session-123')
  })

  it('should generate session ID if none exists', () => {
    const init = withSessionHeaders({
      method: 'POST'
    })

    const headers = init.headers as Headers
    const sessionId = headers.get(SESSION_HEADER)
    expect(sessionId).toMatch(/^sess_/)
    expect(mockLocalStorage.get(SESSION_COOKIE)).toBe(sessionId)
  })

  it('should handle Headers object input', () => {
    mockLocalStorage.set(SESSION_COOKIE, 'test-session-123')
    const existingHeaders = new Headers()
    existingHeaders.set('Custom-Header', 'value')

    const init = withSessionHeaders({
      headers: existingHeaders
    })

    const headers = init.headers as Headers
    expect(headers.get('Custom-Header')).toBe('value')
    expect(headers.get(SESSION_HEADER)).toBe('test-session-123')
  })
})

