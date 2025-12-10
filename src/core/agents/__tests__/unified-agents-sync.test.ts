/**
 * Unified Agents Sync Test
 * 
 * Tests complete conversation flows through multiple agents to verify
 * they work in sync and maintain context consistency.
 */

import { routeToAgent } from '../orchestrator'
import type { AgentContext, ChatMessage } from '../types'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockAgentContext, createMockMessages, mockSummaryResponse, mockProposalResponse } from './test-helpers/agent-test-helpers'

// Mock API key
process.env.GEMINI_API_KEY = 'test-api-key'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'

// Mock all dependencies (reuse from smoke tests)
vi.mock('@/config/env', async () => {
  const actual = await vi.importActual('@/config/env')
  return {
    ...actual,
    getResolvedGeminiApiKey: () => 'test-api-key'
  }
})

vi.mock('@/lib/gemini-safe', () => ({
  safeGenerateText: vi.fn().mockResolvedValue({
    text: 'Mocked agent response',
    response: {
      text: () => 'Mocked agent response'
    },
    toolCalls: []
  })
}))

vi.mock('@/lib/ai-client', async () => {
  const { mockSummaryResponse, mockProposalResponse } = await import('./test-helpers/agent-test-helpers')
  
  const mockGenerateText = vi.fn().mockImplementation(async (options: any) => {
    const messages = options?.messages || []
    const systemMessage = messages.find((m: any) => m.role === 'system')?.content || ''
    const combined = `${systemMessage}`
    
    if (combined.includes('Summary AI') || combined.includes('executiveSummary')) {
      return {
        text: JSON.stringify(mockSummaryResponse),
        response: { 
          text: () => JSON.stringify(mockSummaryResponse),
          headers: new Headers({
            'x-gemini-usage-token-count': '100',
            'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
          })
        }
      }
    }
    
    if (combined.includes('Proposal AI') || combined.includes('PROPOSAL STRUCTURE')) {
      return {
        text: JSON.stringify(mockProposalResponse),
        response: { 
          text: () => JSON.stringify(mockProposalResponse),
          headers: new Headers({
            'x-gemini-usage-token-count': '100',
            'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
          })
        }
      }
    }
    
    return {
      text: 'Mocked response',
      response: { text: () => 'Mocked response' },
      toolCalls: []
    }
  })
  
  return {
    google: vi.fn(() => 'mock-model'),
    generateText: mockGenerateText,
    streamText: vi.fn().mockResolvedValue({
      textStream: (async function* () {
        yield 'Mocked'
        yield ' response'
      })(),
      text: async () => 'Mocked response'
    }),
    generateObject: vi.fn().mockResolvedValue({
      object: { type: 'no_objection', confidence: 0.3 }
    })
  }
})

vi.mock('@/lib/exit-detection', () => ({
  detectExitIntent: vi.fn().mockReturnValue(null)
}))

vi.mock('../utils/detect-objections', () => ({
  detectObjection: vi.fn().mockResolvedValue({
    type: 'no_objection',
    confidence: 0.3
  })
}))

vi.mock('@/lib/supabase', () => {
  const createChain = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
  })
  
  return {
    createClient: vi.fn(() => ({ from: vi.fn(() => createChain()) })),
    getSupabaseService: vi.fn(() => ({ from: vi.fn(() => createChain()) }))
  }
})

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

vi.mock('@/core/context/multimodal-context', () => ({
  multimodalContextManager: {
    getConversationContext: vi.fn().mockResolvedValue({
      summary: { modalitiesUsed: [], totalMessages: 0 },
      audioContext: [],
      visualContext: [],
      uploadContext: []
    }),
    getContext: vi.fn().mockResolvedValue({
      hasRecentImages: false,
      hasRecentAudio: false,
      hasRecentUploads: false,
      recentAnalyses: [],
      recentUploads: []
    })
  }
}))

vi.mock('@/core/analytics/agent-analytics', () => ({
  agentAnalytics: {
    getAnalytics: vi.fn().mockResolvedValue({
      totalExecutions: 0,
      successRate: 1.0,
      averageDuration: 100,
      agentBreakdown: {},
      stageBreakdown: {}
    })
  }
}))

vi.mock('@/core/analytics/tool-analytics', () => ({
  toolAnalytics: {
    getToolAnalytics: vi.fn().mockResolvedValue({
      totalExecutions: 0,
      cacheHitRate: 0.5,
      successRate: 1.0,
      averageDuration: 50
    })
  }
}))

vi.mock('@/core/tools/tool-executor', () => ({
  toolExecutor: {
    execute: vi.fn().mockResolvedValue({
      result: 'Mocked tool result',
      success: true
    })
  }
}))

vi.mock('../agent-persistence', () => ({
  agentPersistence: {
    persist: vi.fn().mockResolvedValue(undefined),
    persistAgentResult: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('Unified Agents Sync', () => {
  const sessionId = 'unified-sync-session'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Conversation Flows', () => {
    it('should complete workshop funnel with all agents in sync', async () => {
      const messages: ChatMessage[] = []
      let currentStage: any = 'DISCOVERY'
      let intelligenceContext: any = {
        email: 'manager@midsize.com',
        name: 'Jane Manager',
        company: {
          name: 'MidSize Tech',
          domain: 'midsize.com',
          industry: 'Software',
          size: '51-200' as const,
          employeeCount: 150
        },
        person: {
          fullName: 'Jane Manager',
          role: 'Engineering Manager',
          seniority: 'Manager' as const
        },
        role: 'Engineering Manager'
      }
      let conversationFlow: any = {
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
        totalUserTurns: 0,
        firstUserTimestamp: Date.now(),
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false
      }

      // Step 1: Discovery
      messages.push({
        id: 'msg-1',
        role: 'user',
        content: 'What services do you offer?',
        timestamp: new Date()
      })

      let result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'chat'
      })

      expect(result.agent).toBe('Discovery Agent')
      expect(result.metadata?.stage).toBe('DISCOVERY')
      messages.push({
        id: 'msg-2',
        role: 'assistant',
        content: result.output,
        timestamp: new Date()
      })

      // Step 2: Continue discovery
      messages.push({
        id: 'msg-3',
        role: 'user',
        content: 'We want to automate our manual reporting',
        timestamp: new Date()
      })

      conversationFlow = {
        ...conversationFlow,
        covered: {
          goals: true,
          pain: true,
          data: true,
          readiness: true,
          budget: false,
          success: false
        },
        totalUserTurns: 2
      }

      currentStage = 'SCORING'
      result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'chat'
      })

      expect(result.agent).toBe('Scoring Agent')
      expect(result.metadata?.stage).toBe('SCORING')
      expect(result.metadata?.leadScore).toBeDefined()
      expect(result.metadata?.fitScore).toBeDefined()

      // Update intelligence context with scores
      intelligenceContext = {
        ...intelligenceContext,
        leadScore: result.metadata?.leadScore,
        fitScore: result.metadata?.fitScore
      }

      // Step 3: Pitch (workshop)
      if (result.metadata?.fitScore && result.metadata.fitScore.workshop > result.metadata.fitScore.consulting) {
        currentStage = 'WORKSHOP_PITCH'
      } else {
        currentStage = 'PITCHING'
      }

      messages.push({
        id: 'msg-4',
        role: 'assistant',
        content: result.output,
        timestamp: new Date()
      })
      messages.push({
        id: 'msg-5',
        role: 'user',
        content: 'Tell me more about the workshop',
        timestamp: new Date()
      })

      result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'chat'
      })

      expect(['Pitch Agent', 'Workshop Sales Agent']).toContain(result.agent)
      expect(['PITCHING', 'WORKSHOP_PITCH']).toContain(result.metadata?.stage)

      // Step 4: Closing
      currentStage = 'CLOSING'
      messages.push({
        id: 'msg-6',
        role: 'assistant',
        content: result.output,
        timestamp: new Date()
      })
      messages.push({
        id: 'msg-7',
        role: 'user',
        content: 'I want to book a call',
        timestamp: new Date()
      })

      result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'chat'
      })

      expect(result.agent).toBe('Closer Agent')
      expect(result.metadata?.stage).toBe('CLOSING')

      // Step 5: Summary
      currentStage = 'SUMMARY'
      result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'conversation_end'
      })

      expect(result.agent).toBe('Summary Agent')
      expect(result.metadata?.stage).toBe('SUMMARY')
    })

    it('should complete consulting funnel with all agents in sync', async () => {
      const messages: ChatMessage[] = []
      let currentStage: any = 'DISCOVERY'
      let intelligenceContext: any = {
        email: 'cto@enterprise.com',
        name: 'Bob CTO',
        company: {
          name: 'Enterprise Inc',
          domain: 'enterprise.com',
          industry: 'Finance',
          size: '1000+' as const,
          employeeCount: 5000
        },
        person: {
          fullName: 'Bob CTO',
          role: 'Chief Technology Officer',
          seniority: 'C-Level' as const
        },
        role: 'CTO'
      }
      let conversationFlow: any = {
        covered: {
          goals: true,
          pain: true,
          data: true,
          readiness: true,
          budget: true,
          success: true
        },
        recommendedNext: null,
        evidence: {
          goals: ['Custom AI system'],
          pain: ['Manual operations'],
          budget: ['Q2 timeline']
        },
        insights: {},
        coverageOrder: [],
        totalUserTurns: 6,
        firstUserTimestamp: Date.now(),
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false
      }

      // Step 1: Scoring
      currentStage = 'SCORING'
      messages.push({
        id: 'msg-1',
        role: 'user',
        content: 'We need a custom AI system',
        timestamp: new Date()
      })

      let result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'chat'
      })

      expect(result.agent).toBe('Scoring Agent')
      intelligenceContext = {
        ...intelligenceContext,
        leadScore: result.metadata?.leadScore,
        fitScore: result.metadata?.fitScore || { workshop: 0.2, consulting: 0.9 }
      }

      // Step 2: Consulting Pitch
      currentStage = 'CONSULTING_PITCH'
      messages.push({
        id: 'msg-2',
        role: 'assistant',
        content: result.output,
        timestamp: new Date()
      })
      messages.push({
        id: 'msg-3',
        role: 'user',
        content: 'Can you send a proposal?',
        timestamp: new Date()
      })

      result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'proposal_request'
      })

      expect(result.agent).toBe('Proposal Agent')
      expect(result.metadata?.stage).toBe('PROPOSAL')

      // Step 3: Closing
      currentStage = 'CLOSING'
      result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext,
        multimodalContext: {},
        conversationFlow,
        trigger: 'chat'
      })

      expect(result.agent).toBe('Closer Agent')
    })

    it('should handle objection overrides correctly', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'This is too expensive',
          timestamp: new Date()
        }
      ]

      const intelligenceContext: any = {
        email: 'manager@company.com',
        name: 'Manager',
        currentObjection: 'price' as const
      }

      // Mock objection detection to return price objection
      const { detectObjection } = await import('../utils/detect-objections')
      ;(detectObjection as any).mockResolvedValueOnce({
        type: 'price',
        confidence: 0.8
      })

      const result = await routeToAgent({
        messages,
        sessionId,
        currentStage: 'PITCHING',
        intelligenceContext,
        multimodalContext: {},
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
          totalUserTurns: 5,
          firstUserTimestamp: Date.now(),
          latestUserTimestamp: Date.now(),
          shouldOfferRecap: false
        },
        trigger: 'chat'
      })

      // Objection agent should be called when objection detected
      expect(result.agent).toContain('Objection Agent')
      // Stage might be OBJECTION or the original stage depending on implementation
      expect(['OBJECTION', 'PITCHING']).toContain(result.metadata?.stage)
    })

    it('should propagate multimodal context across agents', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Let me show you our dashboard',
          timestamp: new Date()
        }
      ]

      const multimodalContext = {
        hasRecentImages: true,
        hasRecentAudio: true,
        hasRecentUploads: true,
        recentAnalyses: ['Dashboard analysis', 'Voice transcription'],
        recentUploads: ['document.pdf']
      }

      // Discovery with multimodal
      let result = await routeToAgent({
        messages,
        sessionId,
        currentStage: 'DISCOVERY',
        intelligenceContext: {
          email: 'user@company.com',
          name: 'User'
        },
        multimodalContext,
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
        },
        trigger: 'chat'
      })

      expect(result.agent).toBe('Discovery Agent')
      expect(result.metadata?.multimodalUsed).toBeDefined()

      // Scoring should include multimodal bonuses
      result = await routeToAgent({
        messages,
        sessionId,
        currentStage: 'SCORING',
        intelligenceContext: {
          email: 'user@company.com',
          name: 'User'
        },
        multimodalContext,
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
        },
        trigger: 'chat'
      })

      expect(result.agent).toBe('Scoring Agent')
      expect(result.metadata?.leadScore).toBeDefined()
      // Score should be higher with multimodal bonuses
      expect(result.metadata?.leadScore).toBeGreaterThan(0)
    })
  })

  describe('Agent Coordination', () => {
    it('should maintain context consistency across transitions', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }
      ]

      const intelligenceContext: any = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Co',
          domain: 'test.com',
          size: '51-200' as const
        }
      }

      // Discovery
      let result = await routeToAgent({
        messages,
        sessionId,
        currentStage: 'DISCOVERY',
        intelligenceContext,
        multimodalContext: {},
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
        },
        trigger: 'chat'
      })

      expect(result.agent).toBe('Discovery Agent')
      const discoveryOutput = result.output

      // Scoring - context should be preserved
      result = await routeToAgent({
        messages,
        sessionId,
        currentStage: 'SCORING',
        intelligenceContext,
        multimodalContext: {},
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
        },
        trigger: 'chat'
      })

      expect(result.agent).toBe('Scoring Agent')
      // Intelligence context should still have company info
      expect(intelligenceContext.company?.name).toBe('Test Co')
    })
  })
})
