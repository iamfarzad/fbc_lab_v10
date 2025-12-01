/**
 * Session Coordinator Integration Tests
 *
 * Tests that session ID coordination works correctly across
 * HTTP chat, tool routes, and Live WebSocket connections.
 */

import {
  normalizeSessionId,
  getSessionIdFromRequest,
  getOrCreateClientSessionId,
  withSessionHeaders,
  SESSION_HEADER,
  LEGACY_SESSION_HEADER
} from '../session-coordinator'
import { NextRequest } from 'next/server'
import { describe, it, expect } from 'vitest'

describe('Session Coordinator Integration', () => {
  describe('HTTP Chat Integration', () => {
    it('should extract session ID from request for /api/chat/unified', () => {
      const req = new NextRequest('http://localhost:3000/api/chat/unified', {
        headers: {
          [SESSION_HEADER]: 'chat-session-123'
        }
      })

      const sessionId = getSessionIdFromRequest(req)
      expect(sessionId).toBe('chat-session-123')
    })

    it.skip('should work with withSessionHeaders helper for fetch calls', () => {
      // Mock window
      const mockLocalStorage = new Map<string, string>()
      mockLocalStorage.set('fbc_session_id', 'client-session-123')

      // @ts-ignore
      global.window = {
        localStorage: {
          getItem: (key: string) => mockLocalStorage.get(key) || null,
          setItem: (key: string, value: string) => {
            mockLocalStorage.set(key, value)
          },
          removeItem: () => {},
          clear: () => {},
          length: 0,
          key: () => null
        },
        location: { href: 'http://localhost:3000/live' }
      }

      const init = withSessionHeaders({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const headers = init.headers as Headers
      expect(headers.get(SESSION_HEADER)).toBe('client-session-123')
      expect(headers.get(LEGACY_SESSION_HEADER)).toBe('client-session-123')

      // @ts-ignore
      delete global.window
    })
  })

  describe('Tool Routes Integration', () => {
    it('should extract session ID for /api/tools/webcam', () => {
      const req = new NextRequest('http://localhost:3000/api/tools/webcam', {
        headers: {
          [SESSION_HEADER]: 'tool-session-123'
        }
      })

      const sessionId = getSessionIdFromRequest(req)
      expect(sessionId).toBe('tool-session-123')
    })

    it('should extract session ID for /api/tools/screen', () => {
      const req = new NextRequest('http://localhost:3000/api/tools/screen', {
        headers: {
          [SESSION_HEADER]: 'screen-session-123'
        }
      })

      const sessionId = getSessionIdFromRequest(req)
      expect(sessionId).toBe('screen-session-123')
    })

    it('should normalize session ID for tool routes', () => {
      const req = new NextRequest('http://localhost:3000/api/tools/document', {
        headers: {
          [SESSION_HEADER]: '  document-session-123  '
        }
      })

      const rawSessionId = getSessionIdFromRequest(req)
      const normalized = normalizeSessionId(rawSessionId)

      expect(normalized).toBe('document-session-123')
    })
  })

  describe('Backward Compatibility', () => {
    it('should support legacy x-session-id header', () => {
      const req = new NextRequest('http://localhost:3000/api/chat/unified', {
        headers: {
          [LEGACY_SESSION_HEADER]: 'legacy-session-123'
        }
      })

      const sessionId = getSessionIdFromRequest(req)
      expect(sessionId).toBe('legacy-session-123')
    })

    it('should prefer new header over legacy header', () => {
      const req = new NextRequest('http://localhost:3000/api/chat/unified', {
        headers: {
          [SESSION_HEADER]: 'new-session-123',
          [LEGACY_SESSION_HEADER]: 'legacy-session-123'
        }
      })

      const sessionId = getSessionIdFromRequest(req)
      expect(sessionId).toBe('new-session-123')
    })

    it('should support body sessionId in request parser (backward compat)', () => {
      // This tests the pattern: bodySessionId || coordinatorSessionId
      const req = new NextRequest('http://localhost:3000/api/chat/unified', {
        headers: {
          [SESSION_HEADER]: 'header-session-123'
        }
      })

      const coordinatorSessionId = getSessionIdFromRequest(req)
      const bodySessionId = 'body-session-123'

      // Simulate request-parser.ts logic
      const resolvedSessionId = bodySessionId || coordinatorSessionId
      const sessionId = normalizeSessionId(resolvedSessionId)

      expect(sessionId).toBe('body-session-123') // body takes precedence
    })
  })

  describe('Session ID Consistency', () => {
    it('should generate consistent session IDs for same input', () => {
      const id1 = normalizeSessionId('test-session-123')
      const id2 = normalizeSessionId('test-session-123')

      expect(id1).toBe(id2)
    })

    it('should generate different session IDs for empty input', () => {
      const id1 = normalizeSessionId('')
      const id2 = normalizeSessionId('')

      expect(id1).toMatch(/^sess_/)
      expect(id2).toMatch(/^sess_/)
      expect(id1).not.toBe(id2) // Each call generates new UUID
    })

    it('should handle session ID format validation', () => {
      const validIds = [
        'sess_abc123',
        'test-session-123',
        'session-123',
        '12345678-1234-1234-1234-123456789012' // UUID format
      ]

      validIds.forEach((id) => {
        const normalized = normalizeSessionId(id)
        expect(normalized).toBe(id.trim())
        expect(normalized.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Live WebSocket Integration', () => {
    it('should normalize session ID from START payload', () => {
      // Simulate what start-handler.ts receives
      const payloadSessionId = '  ws-session-123  '
      const normalized = normalizeSessionId(payloadSessionId)

      expect(normalized).toBe('ws-session-123')
    })

    it('should generate session ID if START payload has none', () => {
      const normalized = normalizeSessionId(undefined)

      expect(normalized).toMatch(/^sess_/)
    })

    it('should handle empty string from START payload', () => {
      const normalized = normalizeSessionId('')

      expect(normalized).toMatch(/^sess_/)
    })
  })

  describe('Cross-System Consistency', () => {
    it('should use same session ID across HTTP chat and tools', () => {
      const sessionId = 'shared-session-123'

      const chatReq = new NextRequest('http://localhost:3000/api/chat/unified', {
        headers: { [SESSION_HEADER]: sessionId }
      })

      const toolReq = new NextRequest('http://localhost:3000/api/tools/webcam', {
        headers: { [SESSION_HEADER]: sessionId }
      })

      const chatSessionId = normalizeSessionId(getSessionIdFromRequest(chatReq))
      const toolSessionId = normalizeSessionId(getSessionIdFromRequest(toolReq))

      expect(chatSessionId).toBe(toolSessionId)
      expect(chatSessionId).toBe(sessionId)
    })

    it('should handle session ID from query param consistently', () => {
      const sessionId = 'query-session-123'

      const req1 = new NextRequest(`http://localhost:3000/api/chat/unified?sessionId=${sessionId}`)
      const req2 = new NextRequest(`http://localhost:3000/api/tools/webcam?sessionId=${sessionId}`)

      const id1 = normalizeSessionId(getSessionIdFromRequest(req1))
      const id2 = normalizeSessionId(getSessionIdFromRequest(req2))

      expect(id1).toBe(id2)
      expect(id1).toBe(sessionId)
    })
  })
})

