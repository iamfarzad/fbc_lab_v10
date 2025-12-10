import { routeToAgent } from '../orchestrator'
import type { AgentContext, ChatMessage } from '../types'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock API key before any imports that need it
process.env.GEMINI_API_KEY = 'test-api-key'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'

// Create async generator for textStream
async function* mockTextStream() {
  yield 'Mocked'
  yield ' response'
}

// Import mock data after defining functions
const { mockSummaryResponse, mockProposalResponse, mockObjectionDetectionResponse } = await import('./test-helpers/agent-test-helpers')

// Mock the config/env module to avoid API key checks
vi.mock('@/config/env', async () => {
  const actual = await vi.importActual('@/config/env')
  return {
    ...actual,
    getResolvedGeminiApiKey: () => 'test-api-key'
  }
})

// Mock the 'ai' package - generateText needs to return proper structure
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mocked response',
    response: {
      text: () => 'Mocked response'
    },
    toolCalls: []
  }),
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
}))

// Mock AI client - use factory function to access mock data
vi.mock('@/lib/ai-client', async () => {
  const { mockSummaryResponse, mockProposalResponse, mockObjectionDetectionResponse } = await import('./test-helpers/agent-test-helpers')
  
  const mockGenerateText = vi.fn().mockImplementation(async (options: any) => {
    const messages = options?.messages || []
    const systemMessage = messages.find((m: any) => m.role === 'system')?.content || ''
    const userMessage = messages.find((m: any) => m.role === 'user')?.content || ''
    const combined = `${systemMessage} ${userMessage}`
    
    // Check if this is a summary agent call
    if (combined.includes('Summary AI') || combined.includes('executiveSummary')) {
      return {
        text: JSON.stringify(mockSummaryResponse),
        response: {
          text: () => JSON.stringify(mockSummaryResponse)
        }
      }
    }
    
    // Check if this is a proposal agent call - be more specific
    if (combined.includes('Proposal AI') || combined.includes('PROPOSAL STRUCTURE') || combined.includes('create formal consulting proposals')) {
      const proposalJson = JSON.stringify(mockProposalResponse)
      return {
        text: proposalJson,
        response: {
          text: () => proposalJson
        }
      }
    }
    
    // Check if this is a retargeting agent call
    if (combined.includes('Retargeting AI') || combined.includes('follow-up email')) {
      return {
        text: JSON.stringify({
          subject: 'Following up on our AI conversation',
          body: 'Test email body',
          cta: 'Reply to this email',
          timing: 'immediate'
        }),
        response: {
          text: () => JSON.stringify({
            subject: 'Following up on our AI conversation',
            body: 'Test email body',
            cta: 'Reply to this email',
            timing: 'immediate'
          })
        }
      }
    }
    
    // Default response - ensure it has text property
    return {
      text: 'Mocked response',
      response: {
        text: () => 'Mocked response'
      },
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
      object: mockObjectionDetectionResponse
    })
  }
})

// Mock Supabase client with full chain
const createMockSupabaseChain = () => {
  const chain = {
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
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => createMockSupabaseChain())
  })),
  getSupabaseService: vi.fn(() => ({
    from: vi.fn(() => createMockSupabaseChain())
  }))
}))

// Mock context storage
vi.mock('@/core/context/context-storage', () => ({
  contextStorage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock multimodal context manager
vi.mock('@/core/context/multimodal-context', () => ({
  multimodalContextManager: {
    getConversationContext: vi.fn().mockResolvedValue({
      summary: {
        modalitiesUsed: [],
        totalMessages: 0
      },
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

// Mock analytics services - return complete structure matching AnalyticsData schema
vi.mock('@/core/analytics/agent-analytics', () => ({
  AgentAnalyticsService: {
    getAnalytics: vi.fn().mockResolvedValue({
      totalExecutions: 0,
      successRate: 1.0,
      averageDuration: 100,
      agentBreakdown: {},
      stageBreakdown: {}
    })
  },
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
  ToolAnalyticsService: {
    getToolAnalytics: vi.fn().mockResolvedValue({
      totalExecutions: 0,
      cacheHitRate: 0.5,
      successRate: 1.0,
      averageDuration: 50
    })
  },
  toolAnalytics: {
    getToolAnalytics: vi.fn().mockResolvedValue({
      totalExecutions: 0,
      cacheHitRate: 0.5,
      successRate: 1.0,
      averageDuration: 50
    })
  }
}))

// Mock tool executor
vi.mock('@/core/tools/tool-executor', () => ({
  toolExecutor: {
    execute: vi.fn().mockResolvedValue({
      result: 'Mocked tool result',
      success: true
    })
  }
}))

// Mock agent persistence
vi.mock('../agent-persistence', () => ({
  agentPersistence: {
    persist: vi.fn().mockResolvedValue(undefined),
    persistAgentResult: vi.fn().mockResolvedValue(undefined)
  }
}))


const mkId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
const msg = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: mkId(),
  role,
  content,
  timestamp: new Date()
})

describe('All Agents Smoke', () => {
  const sessionId = 'smoke-session-1'
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('routes to Closer Agent (CLOSING)', async () => {
    const messages: ChatMessage[] = [
      msg('user', 'We have a couple of questions before booking')
    ]
    const context: AgentContext = {
      sessionId,
      intelligenceContext: {
        email: 'lead@example.com',
        name: 'Lead',
        pitchDelivered: true,
        calendarBooked: false
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
        totalUserTurns: 3,
        firstUserTimestamp: Date.now() - 1_000,
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false
      }
    }
    const res = await routeToAgent({ 
      messages, 
      sessionId,
      currentStage: 'CLOSING',
      intelligenceContext: context.intelligenceContext,
      multimodalContext: {},
      conversationFlow: context.conversationFlow,
      trigger: 'chat' 
    })
    expect(res.agent).toBe('Closer Agent')
    expect(res.metadata?.stage).toBe('CLOSING')
  })

  it('routes to Summary Agent (conversation_end)', async () => {
    const messages: ChatMessage[] = [msg('assistant', 'Goodbye!')]
    const context: AgentContext = {
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
        recommendedNext: 'goals',
        evidence: {},
        insights: {},
        coverageOrder: [],
        totalUserTurns: 0,
        firstUserTimestamp: null,
        latestUserTimestamp: null,
        shouldOfferRecap: false
      }
    }
    const res = await routeToAgent({ 
      messages, 
      sessionId,
      currentStage: 'SUMMARY',
      intelligenceContext: {},
      multimodalContext: {},
      conversationFlow: context.conversationFlow,
      trigger: 'conversation_end' 
    })
    expect(res.agent).toBe('Summary Agent')
    expect(res.metadata?.stage).toBe('SUMMARY')
  })

  it('routes to Admin AI Agent (admin)', async () => {
    const messages: ChatMessage[] = [
      msg('user', 'Show me high-score leads from last week')
    ]
    const res = await routeToAgent({
      messages,
      sessionId: 'admin-session',
      currentStage: 'DISCOVERY', // Ignored by trigger
      intelligenceContext: { email: 'admin@example.com', name: 'Admin' },
      multimodalContext: {},
      trigger: 'admin'
    })
    expect(res.agent).toBe('Admin AI Agent')
    expect(res.metadata?.stage).toBe('ADMIN')
  })

  it('routes to Proposal Agent (proposal_request)', async () => {
    const messages: ChatMessage[] = [msg('user', 'Can you send a proposal?')]
    const context: AgentContext = {
      sessionId,
      intelligenceContext: {
        email: 'cto@enterprise.com',
        name: 'CTO',
        company: { name: 'Big Co', industry: 'Finance', size: '1000+' }
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
        evidence: { goals: ['custom ai'], budget: ['Q2'] },
        insights: {},
        coverageOrder: [],
        totalUserTurns: 4,
        firstUserTimestamp: Date.now() - 10_000,
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false
      }
    }
    const res = await routeToAgent({ 
      messages, 
      sessionId,
      currentStage: 'PITCHING', // Likely stage
      intelligenceContext: context.intelligenceContext,
      multimodalContext: {},
      conversationFlow: context.conversationFlow,
      trigger: 'proposal_request' 
    })
    expect(res.agent).toBe('Proposal Agent')
    expect(res.metadata?.stage).toBe('PROPOSAL')
  })

  it('routes to Retargeting Agent (retargeting trigger)', async () => {
    const messages: ChatMessage[] = [msg('assistant', 'We will follow up soon')]
    const context: AgentContext = {
      sessionId,
      intelligenceContext: {
        email: 'lead@example.com',
        name: 'Lead Name',
        fitScore: { workshop: 0.9, consulting: 0.2 }
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
        recommendedNext: 'budget',
        evidence: {},
        insights: {},
        coverageOrder: [],
        totalUserTurns: 3,
        firstUserTimestamp: Date.now() - 5_000,
        latestUserTimestamp: Date.now(),
        shouldOfferRecap: false
      }
    }
    const res = await routeToAgent({ 
      messages, 
      sessionId,
      currentStage: 'DISCOVERY', // Doesn't matter
      intelligenceContext: context.intelligenceContext,
      multimodalContext: {},
      conversationFlow: context.conversationFlow,
      trigger: 'retargeting' 
    })
    expect(res.agent).toBe('Retargeting Agent')
    expect(res.metadata?.stage).toBe('RETARGETING')
  })
})

