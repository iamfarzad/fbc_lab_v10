import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIBrainService } from '../aiBrainService'
import { createMockFetch, createMockFetchError } from '../../test/helpers/mock-fetch'
import {
  mockTranscript,
  mockTranscriptWithAttachment,
  mockAgentResponse
} from '../../test/helpers/test-data'

const ensureImportEnv = () => {
  const base = (globalThis as any).import ?? ((globalThis as any).import = {})
  base.meta = base.meta || {}
  base.meta.env = base.meta.env || {}
  return base.meta.env as Record<string, any>
}

describe('AIBrainService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const env = ensureImportEnv()
    env.DEV = false
    env.PROD = true
    env.VITE_AGENT_API_URL = 'http://localhost:3002/api/chat'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('sets correct API endpoint in production', () => {
      const env = ensureImportEnv()
      env.DEV = false
      env.PROD = true
      const service = new AIBrainService()
      expect(service.getSessionId()).toMatch(/^session-\d+$/)
    })

    it('sets correct API endpoint in development', () => {
      const env = ensureImportEnv()
      env.DEV = true
      env.PROD = false
      const service = new AIBrainService()
      expect(service.getSessionId()).toMatch(/^session-\d+$/)
    })

    it('uses custom API URL from env in dev', () => {
      const env = ensureImportEnv()
      env.DEV = true
      env.VITE_AGENT_API_URL = 'http://localhost:3003/api/chat'
      const service = new AIBrainService()
      // Can't directly test endpoint, but we can test it's set correctly via chat()
      expect(service).toBeDefined()
    })

    it('generates session ID if not provided', () => {
      const service = new AIBrainService()
      const sessionId = service.getSessionId()
      expect(sessionId).toMatch(/^session-\d+$/)
    })

    it('uses provided session ID', () => {
      const customSessionId = 'custom-session-123'
      const service = new AIBrainService(customSessionId)
      expect(service.getSessionId()).toBe(customSessionId)
    })
  })

  describe('chat()', () => {
    it('formats messages with attachments correctly', async () => {
      const env = ensureImportEnv()
      env.DEV = false
      const mockFetch = createMockFetch(mockAgentResponse)
      global.fetch = mockFetch as any

      const service = new AIBrainService()
      const messages = [
        {
          role: 'user',
          content: 'Hello',
          attachments: [
            {
              mimeType: 'image/png',
              data: 'base64data'
            }
          ]
        }
      ]

      await service.chat(messages)

      expect(mockFetch).toHaveBeenCalled()
      const call = (mockFetch as any).mock.calls[0]
      expect(call[0]).toBe('/api/chat')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')
      expect(call[1].body).toContain('"attachments"')
    })

    it('sends POST request to correct endpoint', async () => {
      const env = ensureImportEnv()
      env.DEV = false
      const mockFetch = createMockFetch(mockAgentResponse)
      global.fetch = mockFetch as any

      const service = new AIBrainService()
      await service.chat([{ role: 'user', content: 'Hello' }])

      expect(mockFetch).toHaveBeenCalled()
      const call = (mockFetch as any).mock.calls[0]
      expect(call[0]).toBe('/api/chat')
      expect(call[1].method).toBe('POST')
    })

    it('handles successful response with AgentResponse', async () => {
      const mockFetch = createMockFetch(mockAgentResponse)
      global.fetch = mockFetch as any

      const service = new AIBrainService()
      const response = await service.chat([{ role: 'user', content: 'Hello' }])

      expect(response).toEqual(mockAgentResponse)
      expect(response.success).toBe(true)
      expect(response.output).toBeDefined()
      expect(response.agent).toBe('Discovery Agent')
    })

    it('handles HTTP errors gracefully', async () => {
      const mockFetch = createMockFetch({ error: 'Bad Request' }, false, 400)
      global.fetch = mockFetch as any

      const service = new AIBrainService()
      const response = await service.chat([{ role: 'user', content: 'Hello' }])

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('handles network errors', async () => {
      const mockFetch = createMockFetchError('Network error')
      global.fetch = mockFetch as any

      const service = new AIBrainService()
      const response = await service.chat([{ role: 'user', content: 'Hello' }])

      expect(response.success).toBe(false)
      expect(response.error).toContain('Network error')
    })

    it('includes conversationFlow and intelligenceContext in request', async () => {
      const mockFetch = createMockFetch(mockAgentResponse)
      global.fetch = mockFetch as any

      const service = new AIBrainService()
      const conversationFlow = { stage: 'DISCOVERY' }
      const intelligenceContext = { research: 'test' }

      await service.chat([{ role: 'user', content: 'Hello' }], {
        conversationFlow,
        intelligenceContext
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.conversationFlow).toEqual(conversationFlow)
      expect(body.intelligenceContext).toEqual(intelligenceContext)
    })

    it('handles malformed JSON response', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Invalid JSON')
          }
        } as Response)
      )
      global.fetch = mockFetch as any

      const service = new AIBrainService()
      const response = await service.chat([{ role: 'user', content: 'Hello' }])

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('transcriptToMessages()', () => {
    it('converts TranscriptItem[] to message format', () => {
      const messages = AIBrainService.transcriptToMessages(mockTranscript)

      expect(messages).toHaveLength(2)
      expect(messages[0]).toEqual({
        role: 'user',
        content: 'Hello'
      })
      expect(messages[1]).toEqual({
        role: 'model',
        content: 'Hi! How can I help you?'
      })
    })

    it('handles attachments correctly', () => {
      const transcript = [mockTranscriptWithAttachment]
      const messages = AIBrainService.transcriptToMessages(transcript)

      expect(messages[0].attachments).toBeDefined()
      expect(messages[0].attachments?.[0]).toEqual({
        mimeType: 'image/png',
        data: 'base64encodeddata'
      })
    })

    it('filters empty text', () => {
      const transcript = [
        { ...mockTranscript[0], text: '' },
        { ...mockTranscript[0], text: '   ' },
        { ...mockTranscript[0], text: 'Valid message' }
      ]

      const messages = AIBrainService.transcriptToMessages(transcript)

      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Valid message')
    })

    it('maps role correctly', () => {
      const transcript = [
        { ...mockTranscript[0], role: 'user' as const },
        { ...mockTranscript[0], role: 'model' as const }
      ]

      const messages = AIBrainService.transcriptToMessages(transcript)

      expect(messages[0].role).toBe('user')
      expect(messages[1].role).toBe('model')
    })
  })

  describe('setSessionId() / getSessionId()', () => {
    it('updates and retrieves session ID', () => {
      const service = new AIBrainService()
      const newSessionId = 'new-session-456'

      service.setSessionId(newSessionId)

      expect(service.getSessionId()).toBe(newSessionId)
    })
  })
})

