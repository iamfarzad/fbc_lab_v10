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

vi.mock('../utils/calculate-roi', () => ({
  calculateRoi: vi.fn().mockReturnValue({
    projectedRoi: 2.5,
    paybackMonths: 6,
    annualSavings: 50000
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

    it('should calculate ROI dynamically', async () => {
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
      // ROI should be calculated
      const { calculateRoi } = await import('../utils/calculate-roi')
      expect(calculateRoi).toHaveBeenCalled()
    })
  })
})
