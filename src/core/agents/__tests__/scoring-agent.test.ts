import { scoringAgent } from '../scoring-agent'
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
    text: JSON.stringify({
      leadScore: 75,
      fitScore: {
        workshop: 0.8,
        consulting: 0.3
      },
      reasoning: 'Strong workshop fit based on role and company size'
    }),
    response: {
      text: () => JSON.stringify({
        leadScore: 75,
        fitScore: {
          workshop: 0.8,
          consulting: 0.3
        },
        reasoning: 'Strong workshop fit'
      }),
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

vi.mock('@/lib/gemini-safe', () => ({
  safeGenerateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      leadScore: 75,
      fitScore: {
        workshop: 0.8,
        consulting: 0.3
      },
      reasoning: 'Strong workshop fit based on role and company size'
    }),
    response: {
      text: () => JSON.stringify({
        leadScore: 75,
        fitScore: {
          workshop: 0.8,
          consulting: 0.3
        },
        reasoning: 'Strong workshop fit'
      }),
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

describe('Scoring Agent', () => {
  const sessionId = 'test-scoring-session'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Core Functionality', () => {
    it('should calculate lead score', async () => {
      const messages: ChatMessage[] = createMockMessages()
      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: {
          email: 'manager@company.com',
          name: 'Manager',
          company: {
            name: 'MidSize Co',
            domain: 'midsize.com',
            size: '51-200' as const,
            employeeCount: 150
          },
          person: {
            fullName: 'Manager',
            role: 'Engineering Manager',
            seniority: 'Manager' as const
          },
          role: 'Engineering Manager'
        },
        conversationFlow: {
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: false,
            success: false
          },
          recommendedNext: 'budget' as const,
          evidence: {},
          insights: {},
          coverageOrder: [],
          totalUserTurns: 4,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await scoringAgent(messages, context)

      expect(result.agent).toBe('Scoring Agent')
      expect(result.metadata?.stage).toBe('SCORING')
      expect(result.metadata?.leadScore).toBeDefined()
      expect(typeof result.metadata?.leadScore).toBe('number')
      expect(result.metadata?.leadScore).toBeGreaterThanOrEqual(0)
      expect(result.metadata?.leadScore).toBeLessThanOrEqual(100)
    })

    it('should calculate fit scores', async () => {
      const messages: ChatMessage[] = createMockMessages()
      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: {
          email: 'cto@enterprise.com',
          name: 'CTO',
          company: {
            name: 'Enterprise Inc',
            domain: 'enterprise.com',
            size: '1000+' as const,
            employeeCount: 5000
          },
          person: {
            fullName: 'CTO',
            role: 'Chief Technology Officer',
            seniority: 'C-Level' as const
          },
          role: 'CTO'
        },
        conversationFlow: {
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: true,
            success: true
          },
          recommendedNext: null,
          evidence: {},
          insights: {},
          coverageOrder: [],
          totalUserTurns: 6,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await scoringAgent(messages, context)

      expect(result.agent).toBe('Scoring Agent')
      expect(result.metadata?.fitScore).toBeDefined()
      expect(result.metadata?.fitScore?.workshop).toBeDefined()
      expect(result.metadata?.fitScore?.consulting).toBeDefined()
      expect(typeof result.metadata?.fitScore?.workshop).toBe('number')
      expect(typeof result.metadata?.fitScore?.consulting).toBe('number')
    })

    it('should apply multimodal bonuses', async () => {
      const messages: ChatMessage[] = createMockMessages()
      const context = createMockAgentContext({
        sessionId,
        multimodalContext: {
          hasRecentImages: true,
          hasRecentAudio: true,
          hasRecentUploads: true,
          recentAnalyses: ['Screen share analysis'],
          recentUploads: ['document.pdf']
        },
        conversationFlow: {
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: true,
            success: true
          },
          recommendedNext: null,
          evidence: {},
          insights: {},
          coverageOrder: [],
          totalUserTurns: 6,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await scoringAgent(messages, context)

      expect(result.agent).toBe('Scoring Agent')
      expect(result.metadata?.leadScore).toBeDefined()
      // With multimodal bonuses, score should be higher
      expect(result.metadata?.leadScore).toBeGreaterThan(0)
    })
  })

  describe('JSON Output', () => {
    it('should return valid JSON structure', async () => {
      const messages: ChatMessage[] = createMockMessages()
      const context = createMockAgentContext({
        sessionId
      })

      const result = await scoringAgent(messages, context)

      expect(result.output).toBeTruthy()
      // Output contains formatted score information
      expect(result.output).toMatch(/Lead Score|leadScore/i)
      expect(result.output).toMatch(/Workshop Fit|fitScore|Consulting Fit/i)
    })
  })
})
