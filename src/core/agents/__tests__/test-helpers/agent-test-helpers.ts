import type { AgentContext, ChatMessage, IntelligenceContext, MultimodalContextData } from '../../types.js'
import type { ConversationFlowState } from '../../../../types/conversation-flow-types.js'
import type { LeadProfile, AgentStrategicContext } from '../../../intelligence/types.js'

/**
 * Test helpers for agent testing
 */

export function createMockMessages(overrides: Partial<ChatMessage>[] = []): ChatMessage[] {
  const baseMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, I need help with AI implementation',
      timestamp: new Date()
    }
  ]
  
  return overrides.length > 0 
    ? overrides.map((override, idx) => ({
        id: `msg-${idx + 1}`,
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
        ...override
      }))
    : baseMessages
}

export function createMockLeadProfile(
  overrides: Partial<LeadProfile> = {}
): LeadProfile {
  return {
    identity: {
      name: 'Test User',
      verified: true,
      confidenceScore: 85,
      ...overrides.identity
    },
    professional: {
      currentRole: 'Engineering Manager',
      company: 'Test Company',
      industry: 'Technology',
      yearsExperience: 7,
      ...overrides.professional
    },
    digitalFootprint: {
      hasGitHub: false,
      hasPublications: false,
      recentSpeaking: false,
      ...overrides.digitalFootprint
    },
    contexthooks: [
      'Given your background as Engineering Manager in Technology',
      'Noticed Test Company recently expanding operations'
    ],
    ...overrides
  }
}

export function createMockStrategicContext(
  overrides: Partial<AgentStrategicContext> = {}
): AgentStrategicContext {
  return {
    privacySensitivity: 'LOW',
    technicalLevel: 'HIGH',
    authorityLevel: 'INFLUENCER',
    ...overrides
  }
}

export function createMockIntelligenceContext(
  overrides: Partial<IntelligenceContext> = {}
): IntelligenceContext {
  const baseContext: IntelligenceContext = {
    email: 'test@example.com',
    name: 'Test User',
    company: {
      name: 'Test Company',
      domain: 'test.com',
      industry: 'Technology',
      size: '51-200' as const,
      employeeCount: 100
    },
    person: {
      fullName: 'Test User',
      role: 'Engineering Manager',
      seniority: 'Manager' as const
    },
    role: 'Engineering Manager',
    roleConfidence: 0.9,
    ...overrides
  }

  // If strategicContext is not provided in overrides, add a default one
  if (!overrides.strategicContext) {
    baseContext.strategicContext = createMockStrategicContext()
  }

  return baseContext
}

export function createMockConversationFlow(
  overrides: Partial<ConversationFlowState> = {}
): ConversationFlowState {
  return {
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
    shouldOfferRecap: false,
    ...overrides
  }
}

export function createMockMultimodalContext(
  overrides: Partial<MultimodalContextData> = {}
): MultimodalContextData {
  return {
    hasRecentImages: false,
    hasRecentAudio: false,
    hasRecentUploads: false,
    recentAnalyses: [],
    recentUploads: [],
    ...overrides
  }
}

export function createMockAgentContext(
  overrides: Partial<AgentContext> = {}
): AgentContext {
  return {
    sessionId: 'test-session-123',
    intelligenceContext: createMockIntelligenceContext(overrides.intelligenceContext),
    conversationFlow: createMockConversationFlow(overrides.conversationFlow),
    multimodalContext: createMockMultimodalContext(overrides.multimodalContext),
    ...overrides
  }
}

/**
 * Mock JSON responses for agents that require structured output
 */
export const mockSummaryResponse = {
  executiveSummary: 'Test conversation summary',
  keyFindings: {
    goals: 'Test goals',
    painPoints: ['Test pain point'],
    currentSituation: 'Test situation',
    dataReality: 'Test data',
    teamReadiness: 'Test readiness',
    budgetSignals: 'Test budget'
  },
  recommendedSolution: 'workshop' as const,
  solutionRationale: 'Test rationale',
  expectedROI: '2.5x return in 6 months',
  pricingBallpark: '$10K-$15K',
  nextSteps: 'Schedule a call to discuss details'
}

export const mockProposalResponse = {
  executiveSummary: {
    client: 'Test Company',
    industry: 'Technology',
    problemStatement: 'Test problem',
    proposedSolution: 'Custom AI implementation'
  },
  scopeOfWork: {
    phases: [
      {
        name: 'Discovery & Planning',
        duration: '2-3 weeks',
        deliverables: ['Requirements doc', 'Technical architecture']
      },
      {
        name: 'Development & Implementation',
        duration: '8-12 weeks',
        deliverables: ['Custom AI system', 'API integrations']
      }
    ]
  },
  timeline: {
    projectStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    milestones: ['Phase 1 complete', 'MVP launch', 'Full deployment'],
    projectCompletion: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  investment: {
    phase1: 25000,
    phase2: 50000,
    phase3: 15000,
    total: 90000,
    paymentTerms: '50% upfront, 25% at MVP, 25% at completion'
  },
  roi: {
    expectedSavings: '$150K annually',
    paybackPeriod: '6 months',
    efficiency: '40% productivity gain'
  }
}

export const mockObjectionDetectionResponse = {
  type: 'no_objection' as const,
  confidence: 0.3
}

/**
 * Create mock WebSocket connection state
 */
export function createMockWebSocketConnection(overrides: Partial<{
  connectionId: string
  sessionId: string
  state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR'
  mediaCount: number
  mediaLastAt: number
}> = {}) {
  return {
    connectionId: 'conn-test-123',
    sessionId: 'test-session',
    state: 'CONNECTED' as const,
    mediaCount: 0,
    mediaLastAt: Date.now(),
    ...overrides
  }
}

/**
 * Create mock multimodal context with recent media
 */
export function createMockMultimodalContextWithMedia(overrides: Partial<MultimodalContextData> = {}): MultimodalContextData {
  return {
    hasRecentImages: true,
    hasRecentAudio: true,
    hasRecentUploads: true,
    recentAnalyses: [
      {
        type: 'screen_share' as const,
        timestamp: Date.now(),
        analysis: 'Test screen share analysis',
        confidence: 0.9
      }
    ],
    recentUploads: [
      {
        type: 'image' as const,
        mimeType: 'image/jpeg',
        timestamp: Date.now(),
        url: 'data:image/jpeg;base64,test'
      }
    ],
    ...overrides
  }
}

/**
 * Create mock performance metrics for testing
 */
export function createMockPerformanceMetrics(overrides: Partial<{
  timeToFirstChunk: number
  contextLoadTime: number
  totalResponseTime: number
  cacheHit: boolean
}> = {}) {
  return {
    timeToFirstChunk: 200,
    contextLoadTime: 150,
    totalResponseTime: 500,
    cacheHit: false,
    ...overrides
  }
}
