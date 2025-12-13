/**
 * End-to-End Agent Flow Tests
 *
 * Tests complete conversation flows through multi-agent system
 */

import { routeToAgent, getCurrentStage } from '../orchestrator'
import type { AgentContext, ChatMessage } from '../types'
import { describe, it, expect, vi } from 'vitest'
import { logger } from 'src/lib/logger'

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

describe('Agent Flow - End to End', () => {
  const sessionId = 'e2e-test-session'

  describe('Workshop Lead Flow', () => {
    it('should complete full workshop funnel', async () => {
      // STEP 1: Discovery
      const messages: ChatMessage[] = [{ role: 'user', content: 'What services do you offer?' }]

      const context: AgentContext = {
        sessionId,
        intelligenceContext: {
          email: 'manager@midsize.com',
          name: 'Jane Manager',
          company: {
            name: 'MidSize Tech',
            industry: 'Software',
            size: '200 employees'
          },
          person: {
            fullName: 'Jane Manager',
            role: 'Engineering Manager',
            seniority: 'Manager'
          },
          role: 'Engineering Manager'
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
          coverageOrder: [],
          totalUserTurns: 1,
          shouldOfferRecap: false
        }
      }

      const currentStage = getCurrentStage(context)
      let result = await routeToAgent({ 
        messages, 
        sessionId: context.sessionId,
        currentStage,
        intelligenceContext: context.intelligenceContext,
        multimodalContext: context.multimodalContext,
        trigger: 'chat',
        conversationFlow: context.conversationFlow
      })
      expect(result.agent).toMatch(/Discovery Agent/)
      expect(result.metadata?.stage).toBe('DISCOVERY')

      // STEP 2: Continue discovery (cover categories)
      messages.push(
        { role: 'assistant', content: result.output },
        { role: 'user', content: 'We want to automate our manual reporting' }
      )

      context.conversationFlow = {
        ...context.conversationFlow!,
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

      const currentStage2 = getCurrentStage(context)
      result = await routeToAgent({ 
        messages, 
        sessionId: context.sessionId,
        currentStage: currentStage2,
        intelligenceContext: context.intelligenceContext,
        multimodalContext: context.multimodalContext,
        trigger: 'chat',
        conversationFlow: context.conversationFlow
      })
      // Should trigger scoring after 4 categories
      expect(['SCORING', 'WORKSHOP_PITCH']).toContain(result.metadata?.stage)

      logger.debug('✅ Workshop flow test passed')
    })
  })

  describe('Consulting Lead Flow', () => {
    it('should complete full consulting funnel', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'We need a custom AI system for our operations' }
      ]

      const context: AgentContext = {
        sessionId,
        intelligenceContext: {
          email: 'cto@enterprise.com',
          name: 'Bob CTO',
          company: {
            name: 'Enterprise Inc',
            industry: 'Finance',
            size: '1000+ employees'
          },
          person: {
            fullName: 'Bob CTO',
            role: 'Chief Technology Officer',
            seniority: 'C-level'
          },
          role: 'CTO',
          fitScore: {
            workshop: 0.2,
            consulting: 0.9
          }
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
          evidence: {
            goals: ['Custom AI system'],
            pain: ['Manual operations'],
            budget: ['Q2 timeline']
          },
          coverageOrder: [],
          totalUserTurns: 6,
          shouldOfferRecap: true
        }
      }

      const currentStage = getCurrentStage(context)
      const result = await routeToAgent({ 
        messages, 
        sessionId: context.sessionId,
        currentStage,
        intelligenceContext: context.intelligenceContext,
        multimodalContext: context.multimodalContext,
        trigger: 'chat',
        conversationFlow: context.conversationFlow
      })
      expect(result.agent).toMatch(/Consulting|Pitch/)
      expect(['CONSULTING_PITCH', 'PITCHING']).toContain(result.metadata?.stage)

      logger.debug('✅ Consulting flow test passed')
    })
  })

  describe('Multimodal Enhancement', () => {
    it('should include screen share context in response', async () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Let me show you our current analytics dashboard'
        }
      ]

      const context: AgentContext = {
        sessionId,
        intelligenceContext: {
          email: 'user@company.com',
          name: 'User Name'
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
          coverageOrder: [],
          totalUserTurns: 1,
          shouldOfferRecap: false
        },
        multimodalContext: {
          hasRecentImages: true,
          hasRecentAudio: false,
          hasRecentUploads: false,
          recentAnalyses: ['Dashboard showing Excel-based reporting with manual data entry'],
          recentUploads: []
        }
      }

      const currentStage = getCurrentStage(context)
      const result = await routeToAgent({ 
        messages, 
        sessionId: context.sessionId,
        currentStage,
        intelligenceContext: context.intelligenceContext,
        multimodalContext: context.multimodalContext,
        trigger: 'chat',
        conversationFlow: context.conversationFlow
      })

      expect(result.metadata?.multimodalUsed).toBe(true)
      expect(result.output).toBeTruthy()

      logger.debug('✅ Multimodal context test passed')
    })
  })
})
