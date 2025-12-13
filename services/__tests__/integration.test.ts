import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIBrainService } from '../aiBrainService'
import { LeadResearchService } from 'src/core/intelligence/lead-research'
import { GeminiLiveService } from '../geminiLiveService'
import { unifiedContext } from '../unifiedContext'
import { createMockFetch } from '../../test/helpers/mock-fetch'
import { mockResearchResult, mockTranscript } from '../../test/helpers/test-data'
import { GoogleGenAI } from '@google/genai'
import { LiveClientWS } from '@/core/live/client'
import { setupAudioMocks } from '../../test/helpers/mock-audio'
import { createMockLiveClientWS } from '../../test/helpers/mock-websocket'

// Mock dependencies used by LeadResearchService + GeminiLiveService
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

vi.mock('src/config/env', () => ({
  getResolvedGeminiApiKey: () => 'test-key',
  createGoogleGenAI: () => new (require('@google/genai').GoogleGenAI)({ apiKey: 'test-key' })
}))

describe('Integration Tests - Services + UnifiedContext', () => {
  let mockAI: any
  let mockModels: any
  let mockLiveClient: ReturnType<typeof createMockLiveClientWS>
  let audioMocks: ReturnType<typeof setupAudioMocks>

  const connectReady = async (service: GeminiLiveService) => {
    // Avoid timer-driven readiness; explicitly drive connection state.
    mockLiveClient.connect.mockImplementation(() => {})
    mockLiveClient.start.mockImplementation(() => {})
    await service.connect()
    mockLiveClient.trigger('connected', 'mock-connection-id')
    mockLiveClient.trigger('session_started', { connectionId: 'mock-connection-id' })
  }

  beforeEach(() => {
    audioMocks = setupAudioMocks()
    mockLiveClient = createMockLiveClientWS()
    ;(LiveClientWS as any).mockImplementation(() => mockLiveClient)

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
      models: mockModels
    }

    ;(GoogleGenAI as any).mockImplementation(() => mockAI)

    unifiedContext.setSessionId('')
    unifiedContext.setResearchContext(null)
    unifiedContext.setTranscript([])
    unifiedContext.setLocation(undefined as any)

    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('LeadResearchService → UnifiedContext → GeminiLiveService.sendContext', async () => {
    const researchService = new LeadResearchService()
    const research = await researchService.researchLead('test@example.com')
    unifiedContext.setResearchContext(research)

    const liveService = new GeminiLiveService({
      apiKey: 'test-api-key',
      modelId: 'test-model',
      onStateChange: vi.fn(),
      onTranscript: vi.fn(),
      onVolumeChange: vi.fn()
    })
    liveService.setResearchContext(research)

    await connectReady(liveService)

    await liveService.sendContext(mockTranscript, { research })

    expect(mockLiveClient.sendContextUpdate).toHaveBeenCalled()
    const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
    expect(call.modality).toBe('intelligence')
    expect(call.metadata.research).toEqual(research)
  })

  it('AIBrainService includes intelligenceContext when provided', async () => {
    const aiBrainService = new AIBrainService()
    const mockFetch = createMockFetch({
      success: true,
      output: 'Response',
      agent: 'Discovery Agent'
    })
    global.fetch = mockFetch as any

    unifiedContext.setResearchContext(mockResearchResult)

    await aiBrainService.chat([{ role: 'user', content: 'Hello' }], {
      // Intelligence context is only forwarded when identity is present (name or email)
      intelligenceContext: { email: 'test@example.com', research: mockResearchResult }
    })

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.intelligenceContext.research).toEqual(mockResearchResult)
  })

  it('AIBrainService session ID persists across calls', async () => {
    const sessionId = 'persistent-session'
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

  it('UnifiedContext location can be forwarded to GeminiLiveService.sendContext', async () => {
    unifiedContext.setLocation(undefined as any)

    const location = { latitude: 40.7128, longitude: -74.006 }
    const getCurrentPosition = vi.fn((success) => {
      success({ coords: location })
    })
    global.navigator.geolocation = { getCurrentPosition } as any

    const fetched = await unifiedContext.ensureLocation()
    expect(fetched).toEqual(location)

    const liveService = new GeminiLiveService({
      apiKey: 'test-api-key',
      modelId: 'test-model',
      onStateChange: vi.fn(),
      onTranscript: vi.fn(),
      onVolumeChange: vi.fn()
    })

    await connectReady(liveService)
    await liveService.sendContext(mockTranscript, { location })

    expect(mockLiveClient.sendContextUpdate).toHaveBeenCalled()
    const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
    expect(call.metadata.location).toEqual(location)
  })
})
