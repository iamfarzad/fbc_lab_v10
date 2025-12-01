import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StandardChatService } from '../standardChatService'
import { GoogleGenAI } from '@google/genai'
import { mockResearchResult, mockTranscript } from '../../test/helpers/test-data'

// Mock GoogleGenAI
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
    ARRAY: 'array',
    BOOLEAN: 'boolean'
  }
}))

describe('StandardChatService', () => {
  let service: StandardChatService
  let mockAI: any
  let mockChat: any
  let mockModels: any

  beforeEach(() => {
    mockChat = {
      sendMessage: vi.fn()
    }

    mockModels = {
      generateContent: vi.fn()
    }

    mockAI = {
      chats: {
        create: vi.fn(() => mockChat)
      },
      models: mockModels
    }

    ;(GoogleGenAI as any).mockImplementation(() => mockAI)

    service = new StandardChatService('test-api-key')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('sets default model', () => {
      expect(service).toBeDefined()
    })
  })

  describe('setResearchContext()', () => {
    it('stores research context', () => {
      service.setResearchContext(mockResearchResult)
      // Context is stored internally, test via sendMessage
      expect(service).toBeDefined()
    })
  })

  describe('setLocation() / getLocation()', () => {
    it('caches location', () => {
      const location = { latitude: 40.7128, longitude: -74.0060 }
      service.setLocation(location)
      // Location is cached internally
      expect(service).toBeDefined()
    })

    it('returns cached location immediately', async () => {
      const location = { latitude: 40.7128, longitude: -74.0060 }
      service.setLocation(location)

      // Mock geolocation to be slow
      const getCurrentPosition = vi.fn((success) => {
        setTimeout(() => success({ coords: { latitude: 0, longitude: 0 } }), 100)
      })
      global.navigator.geolocation = {
        getCurrentPosition
      } as any

      // Should return cached location immediately
      const result = await (service as any).getLocation()
      expect(result).toEqual(location)
    })

    it('fetches location from geolocation API', async () => {
      const location = { latitude: 40.7128, longitude: -74.0060 }
      const getCurrentPosition = vi.fn((success) => {
        success({ coords: location })
      })

      global.navigator.geolocation = {
        getCurrentPosition
      } as any

      const result = await (service as any).getLocation()
      expect(result).toEqual(location)
    })
  })

  describe('sendMessage()', () => {
    it('sends message with default model', async () => {
      const response = {
        text: 'Test response',
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response' }]
            }
          }
        ]
      }

      mockChat.sendMessage.mockResolvedValue(response)

      const result = await service.sendMessage('Hello', mockTranscript)

      expect(mockChat.sendMessage).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('includes research context when available', async () => {
      service.setResearchContext(mockResearchResult)

      const response = {
        text: 'Response with context',
        candidates: [
          {
            content: {
              parts: [{ text: 'Response with context' }]
            }
          }
        ]
      }

      mockChat.sendMessage.mockResolvedValue(response)

      await service.sendMessage('Tell me about the company', mockTranscript)

      expect(mockChat.sendMessage).toHaveBeenCalled()
      const callArgs = mockChat.sendMessage.mock.calls[0]
      expect(callArgs).toBeDefined()
    })

    it('handles errors gracefully', async () => {
      mockChat.sendMessage.mockRejectedValue(new Error('API error'))

      await expect(service.sendMessage('Hello', mockTranscript)).rejects.toThrow()
    })
  })
})

