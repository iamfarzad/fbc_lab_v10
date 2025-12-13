import { pitchAgent } from '../pitch-agent'
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

vi.mock('@/lib/gemini-safe', () => ({
  safeGenerateText: vi.fn().mockResolvedValue({
    text: 'Based on your needs, our AI Acceleration Workshop would be perfect for your team.',
    response: {
      text: () => 'Based on your needs, our AI Acceleration Workshop would be perfect for your team.',
      headers: new Headers()
    },
    toolCalls: []
  })
}))

describe('Pitch Agent', () => {
  const sessionId = 'test-pitch-session'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Core Functionality', () => {
    it('should auto-detect workshop product', async () => {
      const messages: ChatMessage[] = createMockMessages()
      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: {
          email: 'manager@company.com',
          name: 'Manager',
          company: {
            name: 'MidSize Co',
            domain: 'midsize.com',
            size: '51-200' as const
          },
          person: {
            fullName: 'Manager',
            role: 'Engineering Manager',
            seniority: 'Manager' as const
          },
          fitScore: {
            workshop: 0.8,
            consulting: 0.2
          }
        }
      })

      const result = await pitchAgent(messages, context)

      expect(result.agent).toBe('Pitch Agent')
      expect(result.metadata?.stage).toBe('PITCHING')
      expect(result.output).toBeTruthy()
    })

    it('should auto-detect consulting product', async () => {
      const messages: ChatMessage[] = createMockMessages()
      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: {
          email: 'cto@enterprise.com',
          name: 'CTO',
          company: {
            name: 'Enterprise Inc',
            domain: 'enterprise.com',
            size: '1000+' as const
          },
          person: {
            fullName: 'CTO',
            role: 'Chief Technology Officer',
            seniority: 'C-Level' as const
          },
          fitScore: {
            workshop: 0.2,
            consulting: 0.9
          }
        }
      })

      const result = await pitchAgent(messages, context)

      expect(result.agent).toBe('Pitch Agent')
      expect(result.metadata?.stage).toBe('PITCHING')
      expect(result.output).toBeTruthy()
    })

    it('should include ROI guardrails and tools', async () => {
      const messages: ChatMessage[] = createMockMessages()
      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: {
          email: 'manager@company.com',
          name: 'Manager',
          fitScore: {
            workshop: 0.8,
            consulting: 0.2
          }
        }
      })

      const result = await pitchAgent(messages, context)

      expect(result.agent).toBe('Pitch Agent')

      const { safeGenerateText } = await import('@/lib/gemini-safe')
      expect(safeGenerateText).toHaveBeenCalled()
      const call = (safeGenerateText as unknown as { mock: { calls: any[] } }).mock.calls[0]?.[0]
      expect(call?.system).toContain('CRITICAL ROI RULES')
      expect(call?.system).toContain('Do not invent ROI numbers')
      expect(call?.tools).toBeTruthy()
      expect('googleSearch' in (call.tools as Record<string, unknown>)).toBe(true)
    })
  })
})
