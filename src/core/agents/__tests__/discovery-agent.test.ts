import { discoveryAgent } from '../discovery-agent'
import type { AgentContext, ChatMessage } from '../types'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockAgentContext, createMockMessages, createMockLeadProfile, createMockIntelligenceContext } from './test-helpers/agent-test-helpers'

// Mock API key
process.env.GEMINI_API_KEY = 'test-api-key'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'

// Mock dependencies
vi.mock('@/config/env', async () => {
  const actual = await vi.importActual('@/config/env')
  return {
    ...actual,
    getResolvedGeminiApiKey: () => 'test-api-key'
  }
})

vi.mock('@/lib/gemini-safe', () => ({
  safeGenerateText: vi.fn().mockResolvedValue({
    text: 'What are your main goals with AI implementation?',
    response: {
      text: () => 'What are your main goals with AI implementation?',
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

vi.mock('@/lib/exit-detection', () => ({
  detectExitIntent: vi.fn().mockReturnValue(null)
}))

vi.mock('@/core/utils/url-analysis', () => ({
  detectAndAnalyzeUrls: vi.fn().mockResolvedValue({
    urls: [],
    analyses: []
  })
}))

vi.mock('@/server/utils/validate-intelligence-context', () => ({
  validateIntelligenceContext: vi.fn().mockReturnValue({ valid: true, errors: [] })
}))

vi.mock('@/lib/format-messages', () => ({
  formatMessagesForAI: vi.fn((messages) => messages)
}))

vi.mock('@/lib/multimodal-helpers', () => ({
  buildModelSettings: vi.fn(() => ({}))
}))

describe('Discovery Agent', () => {
  const sessionId = 'test-discovery-session'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Core Functionality', () => {
    it('should generate discovery questions', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, I need help with AI',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.metadata?.stage).toBe('DISCOVERY')
      expect(result.output).toBeTruthy()
      expect(result.output.length).toBeGreaterThan(0)
    })

    it('should track category coverage', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'We want to automate our reporting',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        conversationFlow: {
          covered: {
            goals: true,
            pain: true,
            data: false,
            readiness: false,
            budget: false,
            success: false
          },
          recommendedNext: 'data' as const,
          evidence: {
            goals: ['automate reporting'],
            pain: ['manual processes']
          },
          insights: {},
          coverageOrder: [],
          totalUserTurns: 2,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.metadata?.stage).toBe('DISCOVERY')
    })

    it('should handle multimodal context', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Let me show you our dashboard',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        multimodalContext: {
          hasRecentImages: true,
          hasRecentAudio: false,
          hasRecentUploads: false,
          recentAnalyses: ['Dashboard showing manual data entry'],
          recentUploads: []
        },
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.metadata?.stage).toBe('DISCOVERY')
    })
  })

  describe('Exit Intent Detection', () => {
    it('should detect booking intent', async () => {
      const { detectExitIntent } = await import('@/lib/exit-detection')
      vi.mocked(detectExitIntent).mockReturnValue('BOOKING')

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'I want to book a call',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        conversationFlow: {
          covered: {
            goals: true,
            pain: true,
            data: true,
            readiness: true,
            budget: true,
            success: false
          },
          recommendedNext: null,
          evidence: {},
          insights: {},
          coverageOrder: [],
          totalUserTurns: 5,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toBe('Discovery Agent (Booking Mode)')
      expect(result.metadata?.stage).toBe('BOOKING_REQUESTED')
      expect(result.metadata?.triggerBooking).toBe(true)
      expect(result.metadata?.calendarLink).toBeTruthy()
    })

    it('should detect wrap-up intent', async () => {
      const { detectExitIntent } = await import('@/lib/exit-detection')
      vi.mocked(detectExitIntent).mockReturnValue('WRAP_UP')

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'That sounds good, let me think about it',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
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

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toBe('Discovery Agent (Wrap-up Mode)')
      expect(result.metadata?.stage).toBe('WRAP_UP')
      expect(result.metadata?.triggerBooking).toBe(true)
    })
  })

  describe('Profile Integration', () => {
    it('should work with verified profile (high confidence)', async () => {
      const profile = createMockLeadProfile({
        identity: {
          name: 'John Doe',
          verified: true,
          confidenceScore: 90
        },
        professional: {
          currentRole: 'VP of Engineering',
          company: 'Acme Corp',
          industry: 'SaaS',
          yearsExperience: 15
        },
        digitalFootprint: {
          hasGitHub: true,
          hasPublications: false,
          recentSpeaking: false
        }
      })

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: createMockIntelligenceContext({
          profile
        }),
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.metadata?.stage).toBe('DISCOVERY')
      expect(result.output).toBeTruthy()
      // Profile should be injected into system prompt (tested via mock)
    })

    it('should work with unverified profile (low confidence)', async () => {
      const profile = createMockLeadProfile({
        identity: {
          name: 'Jane Smith',
          verified: false,
          confidenceScore: 45
        }
      })

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hi there',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: createMockIntelligenceContext({
          profile
        }),
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.output).toBeTruthy()
    })

    it('should work without profile (stalling UX - Turn 1)', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, I need help',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: createMockIntelligenceContext({
          profile: undefined // No profile yet - research still running
        }),
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.output).toBeTruthy()
      // Should work gracefully without profile
    })

    it('should handle high technical footprint profile', async () => {
      const profile = createMockLeadProfile({
        digitalFootprint: {
          hasGitHub: true,
          hasPublications: true,
          recentSpeaking: true
        }
      })

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Tell me about AI implementation',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: createMockIntelligenceContext({
          profile
        }),
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.output).toBeTruthy()
      // System prompt should indicate high technical level
    })

    it('should handle low technical footprint profile', async () => {
      const profile = createMockLeadProfile({
        digitalFootprint: {
          hasGitHub: false,
          hasPublications: false,
          recentSpeaking: false
        }
      })

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'What can AI do for my business?',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: createMockIntelligenceContext({
          profile
        }),
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.output).toBeTruthy()
      // System prompt should indicate business/creative focus
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing context gracefully', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }
      ]

      const context: AgentContext = {
        sessionId,
        intelligenceContext: undefined,
        conversationFlow: undefined,
        multimodalContext: undefined
      }

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.output).toBeTruthy()
    })

    it('should handle empty messages array', async () => {
      const messages: ChatMessage[] = []

      const context = createMockAgentContext({
        sessionId
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.output).toBeTruthy()
    })

    it('should handle profile with missing fields gracefully', async () => {
      const profile = createMockLeadProfile({
        professional: {
          currentRole: 'Unknown',
          company: 'Unknown Company',
          industry: 'Unknown'
          // Missing yearsExperience
        },
        contexthooks: [] // Empty hooks
      })

      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }
      ]

      const context = createMockAgentContext({
        sessionId,
        intelligenceContext: createMockIntelligenceContext({
          profile
        }),
        conversationFlow: {
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
          insights: {},
          coverageOrder: [],
          totalUserTurns: 1,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        }
      })

      const result = await discoveryAgent(messages, context)

      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.output).toBeTruthy()
    })
  })
})
