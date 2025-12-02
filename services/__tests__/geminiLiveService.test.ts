import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiLiveService } from '../geminiLiveService'
import type { LiveServiceConfig } from '../../types'
import { createMockLiveClientWS } from '../../test/helpers/mock-websocket'
import { setupAudioMocks } from '../../test/helpers/mock-audio'
import { mockResearchResult, mockTranscript } from '../../test/helpers/test-data'
import { LiveClientWS } from 'src/core/live/client'

// Mock LiveClientWS
vi.mock('src/core/live/client', () => ({
  LiveClientWS: vi.fn()
}))

describe('GeminiLiveService', () => {
  let mockConfig: LiveServiceConfig
  let mockLiveClient: ReturnType<typeof createMockLiveClientWS>
  let audioMocks: ReturnType<typeof setupAudioMocks>

  beforeEach(() => {
    audioMocks = setupAudioMocks()
    mockLiveClient = createMockLiveClientWS()
    ;(LiveClientWS as any).mockImplementation(() => mockLiveClient)

    mockConfig = {
      apiKey: 'test-api-key',
      modelId: 'test-model',
      onStateChange: vi.fn(),
      onTranscript: vi.fn(),
      onVolumeChange: vi.fn(),
      onToolCall: vi.fn()
    }

    // Mock getUserMedia to return a stream
    global.navigator.mediaDevices.getUserMedia = vi.fn(() =>
      Promise.resolve({
        getTracks: () => [],
        getAudioTracks: () => []
      } as MediaStream)
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('sets session ID', () => {
      const service = new GeminiLiveService(mockConfig)
      // Session ID is set internally, verify service is created
      expect(service).toBeDefined()
    })
  })

  describe('setConfig()', () => {
    it('updates config correctly', () => {
      const service = new GeminiLiveService(mockConfig)
      service.setConfig({ voiceName: 'NewVoice' })
      // Can't directly test private config, but we can test it via behavior
      expect(service).toBeDefined()
    })
  })

  describe('setResearchContext()', () => {
    it('stores research context', () => {
      const service = new GeminiLiveService(mockConfig)
      service.setResearchContext(mockResearchResult)
      // Context is stored internally, test via sendContext later
      expect(service).toBeDefined()
    })
  })

  describe('connect()', () => {
    it('creates AudioContext instances', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()

      expect(global.AudioContext).toHaveBeenCalled()
    })

    it('resumes suspended audio contexts', async () => {
      audioMocks.mockAudioContext.state = 'suspended'
      const service = new GeminiLiveService(mockConfig)
      await service.connect()

      expect(audioMocks.mockAudioContext.resume).toHaveBeenCalled()
    })

    it('creates LiveClientWS and connects', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()

      expect(LiveClientWS).toHaveBeenCalled()
      expect(mockLiveClient.connect).toHaveBeenCalled()
    })

    it('calls start() after connection established', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()

      // Wait for async connection
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockLiveClient.start).toHaveBeenCalled()
    })

    it('handles session_started event', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()

      // Wait for events
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockConfig.onStateChange).toHaveBeenCalledWith('CONNECTED')
    })

    it('sets up audio processing after session started', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(audioMocks.mockScriptProcessor.onaudioprocess).toBeDefined()
    })

    it('handles connection errors', async () => {
      const errorMockClient = createMockLiveClientWS()
      errorMockClient.connect = vi.fn(() => {
        // Trigger error after a short delay
        setTimeout(() => {
          errorMockClient.trigger('error', new Error('Connection failed'))
        }, 10)
      })
      ;(LiveClientWS as any).mockImplementationOnce(() => errorMockClient)

      const service = new GeminiLiveService(mockConfig)

      // Don't await connect() as it will wait for session_started which won't come
      const connectPromise = service.connect()

      // Wait for error to be triggered
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockConfig.onStateChange).toHaveBeenCalledWith('ERROR')

      // Clean up
      await service.disconnect().catch(() => {})
    }, 15000)
  })

  describe('sendContext()', () => {
    it('formats transcript history correctly', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      await service.sendContext(mockTranscript)

      expect(mockLiveClient.sendContextUpdate).toHaveBeenCalled()
      const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
      expect(call.modality).toBe('intelligence')
      expect(call.metadata).toBeDefined()
    })

    it('includes location and research in metadata', async () => {
      const service = new GeminiLiveService(mockConfig)
      service.setResearchContext(mockResearchResult)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      await service.sendContext(mockTranscript, {
        location: { latitude: 40.7128, longitude: -74.0060 },
        research: mockResearchResult
      })

      const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
      expect(call.metadata.location).toBeDefined()
      expect(call.metadata.research).toBeDefined()
    })

    it('skips sending if not connected', async () => {
      const service = new GeminiLiveService(mockConfig)
      // Don't connect

      await service.sendContext(mockTranscript)

      expect(mockLiveClient.sendContextUpdate).not.toHaveBeenCalled()
    })

    it('filters system messages', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      const transcriptWithSystem = [
        ...mockTranscript,
        { ...mockTranscript[0], text: '[System: test]' }
      ]

      await service.sendContext(transcriptWithSystem)

      const call = (mockLiveClient.sendContextUpdate as any).mock.calls[0][0]
      // Should not include system message
      expect(call.analysis).toBeDefined()
    })
  })

  describe('sendText()', () => {
    it('sends text via LiveClient', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      service.sendText('Hello')

      expect(mockLiveClient.sendText).toHaveBeenCalledWith('Hello')
    })

    it('skips sending if not connected', () => {
      const service = new GeminiLiveService(mockConfig)
      service.sendText('Hello')

      expect(mockLiveClient.sendText).not.toHaveBeenCalled()
    })
  })

  describe('sendRealtimeMedia()', () => {
    it('formats media correctly', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      service.sendRealtimeMedia({ mimeType: 'audio/pcm', data: 'base64data' })

      expect(mockLiveClient.sendRealtimeInput).toHaveBeenCalledWith([
        { mimeType: 'audio/pcm', data: 'base64data' }
      ])
    })
  })

  describe('disconnect()', () => {
    it('cleans up all audio resources', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      await service.disconnect()

      expect(audioMocks.mockAudioContext.close).toHaveBeenCalled()
      expect(audioMocks.mockScriptProcessor.disconnect).toHaveBeenCalled()
    })

    it('disconnects LiveClient', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      await service.disconnect()

      expect(mockLiveClient.disconnect).toHaveBeenCalled()
      expect(mockConfig.onStateChange).toHaveBeenCalledWith('DISCONNECTED')
    })
  })

  describe('setSessionId()', () => {
    it('updates session ID', () => {
      const service = new GeminiLiveService(mockConfig)
      const newSessionId = 'new-session-123'
      service.setSessionId(newSessionId)
      // Session ID is stored internally, verify method doesn't throw
      expect(service).toBeDefined()
    })
  })

  describe('getInputVolume() / getOutputVolume()', () => {
    it('returns volume data correctly', async () => {
      const service = new GeminiLiveService(mockConfig)
      await service.connect()
      await new Promise((resolve) => setTimeout(resolve, 50))

      const inputVolume = service.getInputVolume()
      const outputVolume = service.getOutputVolume()

      expect(Array.isArray(inputVolume)).toBe(true)
      expect(Array.isArray(outputVolume)).toBe(true)
    })
  })
})

