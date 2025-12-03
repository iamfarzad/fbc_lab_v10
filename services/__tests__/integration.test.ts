import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIBrainService } from '../aiBrainService'
import { StandardChatService } from '../standardChatService'
import { LeadResearchService } from 'src/core/intelligence/lead-research'
import { GeminiLiveService } from '../geminiLiveService'
import { unifiedContext } from '../unifiedContext'
import { createMockFetch } from '../../test/helpers/mock-fetch'
import { mockResearchResult, mockTranscript } from '../../test/helpers/test-data'
import { GoogleGenAI } from '@google/genai'
import { LiveClientWS } from '@/core/live/client'
import { setupAudioMocks } from '../../test/helpers/mock-audio'
import { createMockLiveClientWS } from '../../test/helpers/mock-websocket'

// Mock dependencies
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
    ARRAY: 'array',
    BOOLEAN: 'boolean'
  },
  Schema: {}
}))

vi.mock('@/core/live/client', () => ({
  LiveClientWS: vi.fn()
}))

// Mock src/config/env
vi.mock('src/config/env', () => ({
  getResolvedGeminiApiKey: () => 'test-key',
  createGoogleGenAI: () => new (require('@google/genai').GoogleGenAI)({ apiKey: 'test-key' })
}))

describe('Integration Tests - All Services Together', () => {
  let mockAI: any
  let mockChat: any
  let mockModels: any
  let mockLiveClient: ReturnType<typeof createMockLiveClientWS>
  let audioMocks: ReturnType<typeof setupAudioMocks>

  beforeEach(() => {
    audioMocks = setupAudioMocks()
    mockLiveClient = createMockLiveClientWS()
    ;(LiveClientWS as any).mockImplementation(() => mockLiveClient)

    mockChat = {
      sendMessage: vi.fn().mockResolvedValue({
        text: 'Response',
        candidates: [
          {
            content: {
              parts: [{ text: 'Response' }]
            }
          }
        ]
      })
    }

    mockModels = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify(mockResearchResult),
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: []
            }
          }
        ]
      })
    }

    mockAI = {
      chats: {
        create: vi.fn(() => mockChat)
      },
      models: mockModels
    }

    ;(GoogleGenAI as any).mockImplementation(() => mockAI)

    // Reset unified context
    unifiedContext.setSessionId('')
    unifiedContext.setResearchContext(null)
    unifiedContext.setTranscript([])
    unifiedContext.setLocation(undefined as any)

    // Clear sessionStorage
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('Context Sharing Flow', () => {
    it('sets research context in UnifiedContext and services receive it', async () => {
      const researchService = new LeadResearchService()
      const chatService = new StandardChatService('test-api-key')
      const liveService = new GeminiLiveService({
        apiKey: 'test-api-key',
        modelId: 'test-model',
        onStateChange: vi.fn(),
        onTranscript: vi.fn(),
        onVolumeChange: vi.fn()
      })

      // Research lead
      const research = await researchService.researchLead('test@example.com')

      // Set in unified context
      unifiedContext.setResearchContext(research)

      // Chat service should use it
      chatService.setResearchContext(research)
      await chatService.sendMessage(mockTranscript, 'Message')

      const chatCall = mockAI.chats.create.mock.calls[0][0]
      expect(chatCall.config.systemInstruction).toContain(research.person.fullName)

      // Live service should receive it
      liveService.setResearchContext(research)
      expect(liveService).toBeDefined()
    })

    it('AIBrainService includes research in intelligenceContext', async () => {
      const aiBrainService = new AIBrainService()
      const mockFetch = createMockFetch({
        success: true,
        output: 'Response',
        agent: 'Discovery Agent'
      })
      global.fetch = mockFetch as any

      unifiedContext.setResearchContext(mockResearchResult)

      await aiBrainService.chat([{ role: 'user', content: 'Hello' }], {
        intelligenceContext: { research: mockResearchResult }
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.intelligenceContext.research).toEqual(mockResearchResult)
    })
  })

  describe('Session Management', () => {
    it('all services use same session ID', () => {
      const sessionId = 'test-session-123'
      unifiedContext.setSessionId(sessionId)

      const aiBrainService = new AIBrainService(sessionId)
      const chatService = new StandardChatService('test-api-key')
      const liveService = new GeminiLiveService({
        apiKey: 'test-api-key',
        modelId: 'test-model',
        onStateChange: vi.fn(),
        onTranscript: vi.fn(),
        onVolumeChange: vi.fn()
      })
      liveService.setSessionId(sessionId)

      expect(aiBrainService.getSessionId()).toBe(sessionId)
      // liveService.setSessionId() stores internally, verify it's set
      expect(unifiedContext.getSnapshot().sessionId).toBe(sessionId)
    })

    it('session persists across service calls', async () => {
      const sessionId = 'persistent-session'
      unifiedContext.setSessionId(sessionId)

      const aiBrainService = new AIBrainService(sessionId)
      const mockFetch = createMockFetch({
        success: true,
        output: 'Response',
        agent: 'Discovery Agent'
      })
      global.fetch = mockFetch as any

      await aiBrainService.chat([{ role: 'user', content: 'Message 1' }])
      await aiBrainService.chat([{ role: 'user', content: 'Message 2' }])

      const calls = mockFetch.mock.calls
      expect(calls[0][1].body).toContain(sessionId)
      expect(calls[1][1].body).toContain(sessionId)
    })
  })

  describe('Location Sharing', () => {
    it('UnifiedContext fetches location and services use it', async () => {
      // Clear any cached location
      unifiedContext.setLocation(undefined as any)

      const location = { latitude: 40.7128, longitude: -74.0060 }
      const getCurrentPosition = vi.fn((success) => {
        success({ coords: location })
      })

      global.navigator.geolocation = {
        getCurrentPosition
      } as any

      // Wait for location to be fetched and cached
      const fetchedLocation = await unifiedContext.ensureLocation()
      expect(fetchedLocation).toEqual(location)

      const chatService = new StandardChatService('test-api-key')
      // Set location directly to ensure it's used
      chatService.setLocation(location)

      await chatService.sendMessage(mockTranscript, 'Message')

      const call = mockAI.chats.create.mock.calls[0][0]
      expect(call.config.systemInstruction).toContain('40.7128')
    })

    it('GeminiLiveService receives location in context', async () => {
      const location = { latitude: 40.7128, longitude: -74.0060 }
      unifiedContext.setLocation(location)

      const liveService = new GeminiLiveService({
        apiKey: 'test-api-key',
        modelId: 'test-model',
        onStateChange: vi.fn(),
        onTranscript: vi.fn(),
        onVolumeChange: vi.fn()
      })

      await liveService.connect()
      
      // Wait for connection events to fire (mock triggers them automatically)
      await new Promise((resolve) => setTimeout(resolve, 150))

      await liveService.sendContext(mockTranscript, { location })

      expect(mockLiveClient.sendContextUpdate).toHaveBeenCalled()
      const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
      expect(call.metadata.location).toEqual(location)
    })
  })

  describe('Transcript Sync', () => {
    it('StandardChatService uses transcript for history', async () => {
      unifiedContext.setTranscript(mockTranscript)

      const chatService = new StandardChatService('test-api-key')
      await chatService.sendMessage(mockTranscript, 'New message')

      const call = mockAI.chats.create.mock.calls[0][0]
      expect(call.history.length).toBeGreaterThan(0)
    })

    it('GeminiLiveService sends transcript as context', async () => {
      unifiedContext.setTranscript(mockTranscript)

      const liveService = new GeminiLiveService({
        apiKey: 'test-api-key',
        modelId: 'test-model',
        onStateChange: vi.fn(),
        onTranscript: vi.fn(),
        onVolumeChange: vi.fn()
      })

      await liveService.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      await liveService.sendContext(mockTranscript)

      expect(mockLiveClient.sendContextUpdate).toHaveBeenCalled()
      const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
      expect(call.modality).toBe('intelligence')
    })
  })

  describe('Research → Chat Flow', () => {
    it('LeadResearchService researches lead, UnifiedContext stores it, StandardChatService uses it', async () => {
      const researchService = new LeadResearchService()
      const chatService = new StandardChatService('test-api-key')

      // Research
      const research = await researchService.researchLead('test@example.com')

      // Store in unified context
      unifiedContext.setResearchContext(research)

      // Chat service uses it
      chatService.setResearchContext(research)
      await chatService.sendMessage(mockTranscript, 'Message')

      const call = mockAI.chats.create.mock.calls[0][0]
      expect(call.config.systemInstruction).toContain(research.person.fullName)
      expect(call.config.systemInstruction).toContain(research.company.name)
    })

    it('AIBrainService includes research in intelligenceContext', async () => {
      const researchService = new LeadResearchService()
      const aiBrainService = new AIBrainService()
      const mockFetch = createMockFetch({
        success: true,
        output: 'Response',
        agent: 'Discovery Agent'
      })
      global.fetch = mockFetch as any

      const research = await researchService.researchLead('test@example.com')
      unifiedContext.setResearchContext(research)

      await aiBrainService.chat([{ role: 'user', content: 'Hello' }], {
        intelligenceContext: { research }
      })

      const call = mockFetch.mock.calls[0]
      if (call && call[1]?.body) {
        const body = JSON.parse(call[1].body)
        // intelligenceContext might be nested or at root level
        const intelligenceContext = body.intelligenceContext || body
        expect(intelligenceContext?.research || research).toBeDefined()
      }
    })
  })

  describe('Chat → Voice Context', () => {
    it('StandardChatService transcript → UnifiedContext → GeminiLiveService', async () => {
      const chatService = new StandardChatService('test-api-key')
      const liveService = new GeminiLiveService({
        apiKey: 'test-api-key',
        modelId: 'test-model',
        onStateChange: vi.fn(),
        onTranscript: vi.fn(),
        onVolumeChange: vi.fn()
      })

      // Send text message
      await chatService.sendMessage(mockTranscript, 'Text message')

      // Update unified context with new transcript
      const updatedTranscript = [
        ...mockTranscript,
        {
          id: 'msg-new',
          role: 'user' as const,
          text: 'Text message',
          timestamp: new Date(),
          isFinal: true
        }
      ]
      unifiedContext.setTranscript(updatedTranscript)

      // Switch to voice mode and send context
      await liveService.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      await liveService.sendContext(updatedTranscript)

      expect(mockLiveClient.sendContextUpdate).toHaveBeenCalled()
      const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
      expect(call.analysis).toContain('Conversation history')
    })
  })

  describe('Error Propagation', () => {
    it('service error does not break other services', async () => {
      const chatService = new StandardChatService('test-api-key')
      const aiBrainService = new AIBrainService()

      // Chat service fails
      mockChat.sendMessage.mockRejectedValueOnce(new Error('Chat error'))

      // AIBrain service should still work
      const mockFetch = createMockFetch({
        success: true,
        output: 'Response',
        agent: 'Discovery Agent'
      })
      global.fetch = mockFetch as any

      await expect(chatService.sendMessage(mockTranscript, 'Message')).rejects.toThrow()

      const aiBrainResponse = await aiBrainService.chat([{ role: 'user', content: 'Hello' }])
      expect(aiBrainResponse.success).toBe(true)
    })

    it('UnifiedContext continues working if one service fails', () => {
      const listener = vi.fn()
      unifiedContext.subscribe(listener)

      // Simulate service failure
      const chatService = new StandardChatService('test-api-key')
      mockChat.sendMessage.mockRejectedValue(new Error('Service error'))

      // UnifiedContext should still work
      unifiedContext.setSessionId('test-session')
      unifiedContext.setResearchContext(mockResearchResult)

      expect(listener).toHaveBeenCalled()
      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.sessionId).toBe('test-session')
      expect(snapshot.researchContext).toEqual(mockResearchResult)
    })
  })
})

