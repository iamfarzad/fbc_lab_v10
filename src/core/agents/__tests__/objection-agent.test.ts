import { objectionAgent } from '../objection-agent'
import type { AgentContext, ChatMessage } from '../types'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockAgentContext, createMockMessages } from './test-helpers/agent-test-helpers'

process.env.GEMINI_API_KEY = 'test-api-key'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'

vi.mock('@/config/env', async () => {
  const actual = await vi.importActual('@/config/env')
  return {
    ...actual,
    getResolvedGeminiApiKey: () => 'test-api-key'
  }
})

vi.mock('@/lib/ai-client', () => ({
  google: vi.fn(() => 'mock-model'),
  generateText: vi.fn().mockResolvedValue({
    text: 'I understand budget is a consideration. Let me show you the ROI specific to your situation.',
    response: {
      text: () => 'I understand budget is a consideration. Let me show you the ROI specific to your situation.',
      headers: new Headers({
        'x-gemini-usage-token-count': '100',
        'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
      }),
      rawResponse: new Response(null, { status: 200 })
    },
    toolCalls: [],
    finishReason: 'stop'
  })
}))

vi.mock('@/lib/gemini-safe', () => ({
  safeGenerateText: vi.fn().mockResolvedValue({
    text: 'I understand budget is a consideration. Let me show you the ROI specific to your situation.',
    response: {
      text: () => 'I understand budget is a consideration. Let me show you the ROI specific to your situation.',
      headers: new Headers({
        'x-gemini-usage-token-count': '100',
        'x-goog-ai-generative-usage': JSON.stringify({ 
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150
        })
      }),
      rawResponse: new Response(null, { 
        status: 200,
        headers: new Headers({
          'x-gemini-usage-token-count': '100'
        })
      })
    },
    toolCalls: [],
    finishReason: 'stop',
    usage: {
      promptTokens: 100,
      completionTokens: 50
    }
  })
}))

vi.mock('@/core/agents/utils/detect-objections', () => ({
  detectObjection: vi.fn().mockResolvedValue({
    type: 'price',
    confidence: 0.8
  })
}))

describe('Objection Agent', () => {
  const sessionId = 'test-objection-session'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Core Functionality', () => {
    it('should handle price objection', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'This is too expensive for us',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: {
          email: 'manager@company.com',
          name: 'Manager',
          currentObjection: 'price' as const
        }
      })

      const result = await objectionAgent(messages, context)

      expect(result.agent).toBe('Objection Agent')
      expect(result.metadata?.stage).toBe('CLOSING') // Objection agent sets stage to CLOSING
      expect(result.output).toBeTruthy()
      // Check for price-related terms (budget, expensive, cost, roi, price)
      const outputLower = result.output.toLowerCase()
      expect(
        outputLower.includes('budget') ||
        outputLower.includes('expensive') ||
        outputLower.includes('cost') ||
        outputLower.includes('roi') ||
        outputLower.includes('price') ||
        outputLower.includes('$')
      ).toBe(true)
    })

    it('should handle timing objection', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Not the right time for us',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: {
          email: 'manager@company.com',
          name: 'Manager',
          currentObjection: 'timing' as const
        }
      })

      const result = await objectionAgent(messages, context)

      expect(result.agent).toBe('Objection Agent')
      expect(result.metadata?.stage).toBe('CLOSING') // Objection agent sets stage to CLOSING
    })
  })
})
