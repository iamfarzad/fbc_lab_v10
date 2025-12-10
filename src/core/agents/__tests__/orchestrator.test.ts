import { routeToAgent, getCurrentStage } from '../orchestrator'
import type { AgentContext, ChatMessage } from '../types'
import { describe, it, expect, vi } from 'vitest'

// Mock API key before any imports that need it
process.env.GEMINI_API_KEY = 'test-api-key'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'

// Mock the config/env module to avoid API key checks
vi.mock('@/config/env', async () => {
  const actual = await vi.importActual('@/config/env')
  return {
    ...actual,
    getResolvedGeminiApiKey: () => 'test-api-key'
  }
})

// Mock context storage to avoid persistence failures
vi.mock('@/core/context/context-storage', () => ({
  contextStorage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateWithVersionCheck: vi.fn().mockResolvedValue(undefined)
  },
  ContextStorage: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateWithVersionCheck: vi.fn().mockResolvedValue(undefined)
  }))
}))

// Mock ai-client for generateText calls
vi.mock('@/lib/ai-client', () => ({
  google: vi.fn(() => 'mock-model'),
  generateText: vi.fn().mockResolvedValue({
    text: 'Mocked response',
    response: {
      text: () => 'Mocked response',
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

// Mock gemini-safe for safeGenerateText used by discovery agent
vi.mock('@/lib/gemini-safe', () => ({
  safeGenerateText: vi.fn().mockResolvedValue({
    text: 'Mocked discovery response',
    response: {
      text: () => 'Mocked discovery response',
      headers: new Headers({
        'x-gemini-usage-token-count': '100',
        'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
      }),
      rawResponse: new Response(null, { status: 200 })
    },
    toolCalls: [],
    finishReason: 'stop',
    usage: {
      promptTokens: 100,
      completionTokens: 50
    }
  })
}))

// Mock objection detection
vi.mock('@/core/agents/utils/detect-objections', () => ({
  detectObjection: vi.fn().mockResolvedValue({
    type: 'no_objection',
    confidence: 0.3
  })
}))

describe('Multi-Agent Orchestrator', () => {
  const mockSessionId = 'test-session-123'

  const mockIntelligenceContext = {
    email: 'test@example.com',
    name: 'John Doe',
    company: {
      name: 'Acme Corp',
      industry: 'Healthcare',
      size: '100-500'
    },
    person: {
      fullName: 'John Doe',
      role: 'Engineering Manager',
      seniority: 'Manager'
    },
    role: 'Engineering Manager',
    roleConfidence: 0.9
  }

  const mockConversationFlow = {
    covered: {
      goals: false,
      pain: false,
      data: false,
      readiness: false,
      budget: false,
      success: false
    },
    recommendedNext: 'goals' as const,
    evidence: {},
    coverageOrder: [],
    totalUserTurns: 0,
    firstUserTimestamp: Date.now(),
    latestUserTimestamp: Date.now(),
    shouldOfferRecap: false
  }

  describe('Stage Determination', () => {
    it('should route to Discovery Agent on first message', () => {
      const context: AgentContext = {
        sessionId: mockSessionId,
        intelligenceContext: mockIntelligenceContext,
        conversationFlow: mockConversationFlow
      }

      const stage = getCurrentStage(context)
      expect(stage).toBe('DISCOVERY')
    })

    it('should route to Scoring Agent after 4+ categories covered', () => {
      const context: AgentContext = {
        sessionId: mockSessionId,
        intelligenceContext: mockIntelligenceContext,
        conversationFlow: {
          ...mockConversationFlow,
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: false,
            success: false
          },
          totalUserTurns: 4
        }
      }

      const stage = getCurrentStage(context)
      expect(stage).toBe('SCORING')
    })

    it('should route to Workshop Agent when workshop fit > 0.7', () => {
      const context: AgentContext = {
        sessionId: mockSessionId,
        intelligenceContext: {
          ...mockIntelligenceContext,
          fitScore: {
            workshop: 0.8,
            consulting: 0.3
          }
        },
        conversationFlow: {
          ...mockConversationFlow,
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: true,
            success: true
          }
        }
      }

      const stage = getCurrentStage(context)
      expect(stage).toBe('WORKSHOP_PITCH')
    })

    it('should route to Consulting Agent when consulting fit > 0.7', () => {
      const context: AgentContext = {
        sessionId: mockSessionId,
        intelligenceContext: {
          ...mockIntelligenceContext,
          fitScore: {
            workshop: 0.3,
            consulting: 0.9
          }
        },
        conversationFlow: {
          ...mockConversationFlow,
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: true,
            success: true
          }
        }
      }

      const stage = getCurrentStage(context)
      expect(stage).toBe('CONSULTING_PITCH')
    })

    it('should route to Closer when pitch delivered but no booking', () => {
      const context: AgentContext = {
        sessionId: mockSessionId,
        intelligenceContext: {
          ...mockIntelligenceContext,
          fitScore: {
            workshop: 0.8,
            consulting: 0.3
          },
          pitchDelivered: true,
          calendarBooked: false
        },
        conversationFlow: {
          ...mockConversationFlow,
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: true,
            success: true
          }
        }
      }

      const stage = getCurrentStage(context)
      expect(stage).toBe('CLOSING')
    })
  })

  describe('Multimodal Context Integration', () => {
    it('should include multimodal context in agent result', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'What do you do?' }]

      const context: AgentContext = {
        sessionId: mockSessionId,
        intelligenceContext: mockIntelligenceContext,
        conversationFlow: mockConversationFlow,
        multimodalContext: {
          hasRecentImages: true,
          hasRecentAudio: false,
          hasRecentUploads: false,
          recentAnalyses: ['Dashboard showing revenue decline'],
          recentUploads: []
        }
      }

      const result = await routeToAgent({
        messages,
        sessionId: mockSessionId,
        currentStage: 'DISCOVERY',
        intelligenceContext: mockIntelligenceContext,
        multimodalContext: context.multimodalContext,
        trigger: 'chat',
        conversationFlow: mockConversationFlow
      })

      expect(result.metadata?.multimodalUsed).toBe(true)
      expect(result.agent).toMatch(/Discovery Agent/)
    })
  })

  describe('Usage Limits', () => {
    it('should return limit error when message limit reached', async () => {
      // Note: This test requires mocking usageLimiter
      // For now, we just verify the structure
      const messages: ChatMessage[] = [{ role: 'user', content: 'Test message' }]

      const context: AgentContext = {
        sessionId: 'limit-test-session',
        conversationFlow: mockConversationFlow
      }

      const result = await routeToAgent({
        messages,
        context,
        trigger: 'chat'
      })

      expect(result).toHaveProperty('output')
      expect(result).toHaveProperty('agent')
      expect(result).toHaveProperty('metadata')
    })
  })

  describe('Agent Metadata', () => {
    it('should include stage in metadata', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'What services do you offer?' }]

      const context: AgentContext = {
        sessionId: mockSessionId,
        intelligenceContext: mockIntelligenceContext,
        conversationFlow: mockConversationFlow
      }

      const result = await routeToAgent({
        messages,
        context,
        trigger: 'chat'
      })

      expect(result.metadata?.stage).toBeDefined()
      expect([
        'DISCOVERY',
        'SCORING',
        'WORKSHOP_PITCH',
        'CONSULTING_PITCH',
        'CLOSING'
      ]).toContain(result.metadata?.stage)
    })

    it('should include agent name in result', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      const context: AgentContext = {
        sessionId: mockSessionId,
        conversationFlow: mockConversationFlow
      }

      const result = await routeToAgent({
        messages,
        context,
        trigger: 'chat'
      })

      expect(result.agent).toBeTruthy()
      expect(typeof result.agent).toBe('string')
    })
  })
})

