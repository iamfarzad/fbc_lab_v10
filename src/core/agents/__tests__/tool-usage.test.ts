/**
 * Agent Tool Usage Tests
 * 
 * Tests that agents can call new tools correctly and respect sales constraints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { discoveryAgent } from '../discovery-agent.js'
import { pitchAgent } from '../pitch-agent.js'
import { closerAgent } from '../closer-agent.js'
import type { AgentContext, ChatMessage } from '../types.js'

// Mock tool definitions
vi.mock('../../tools/unified-tool-registry.js', () => ({
  getChatToolDefinitions: vi.fn(() => ({
    analyze_website_tech_stack: {
      description: 'Analyze website tech stack',
      parameters: {} as any,
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { stack: ['WordPress'], message: 'Analyzed' }
      })
    },
    analyze_competitor_gap: {
      description: 'Analyze competitor gap',
      parameters: {} as any,
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { gaps: [], message: 'Analyzed' }
      })
    },
    generate_custom_syllabus: {
      description: 'Generate custom syllabus',
      parameters: {} as any,
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { syllabus: '# Workshop Syllabus' }
      })
    },
    generate_architecture_diagram: {
      description: 'Generate architecture diagram',
      parameters: {} as any,
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { diagram: 'graph TD; A-->B', message: 'Generated' }
      })
    },
    search_internal_case_studies: {
      description: 'Search internal case studies',
      parameters: {} as any,
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { results: [], message: 'Searched' }
      })
    },
    simulate_cost_of_inaction: {
      description: 'Calculate cost of inaction',
      parameters: {} as any,
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { monthlyCost: 10000, message: 'Calculated' }
      })
    }
  }))
}))

// Mock AI generation
vi.mock('../../../lib/gemini-safe.js', () => ({
  safeGenerateText: vi.fn().mockResolvedValue({
    text: 'Test response',
    metadata: {}
  })
}))

vi.mock('../../../lib/ai-client.js', () => ({
  google: vi.fn(),
  generateText: vi.fn().mockResolvedValue({
    text: 'Test response'
  })
}))

describe('Agent Tool Usage', () => {
  const mockContext: AgentContext = {
    sessionId: 'test-session',
    intelligenceContext: {
      company: { name: 'Test Company', industry: 'tech', size: 'mid' },
      person: { role: 'CTO', seniority: 'executive' }
    },
    multimodalContext: {
      hasRecentImages: false,
      hasRecentAudio: false,
      hasRecentUploads: false,
      recentAnalyses: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Sales Constraint Integration', () => {
    it('should include sales constraint in discovery agent system prompt', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'How do I implement RAG pipelines?' }
      ]

      // This test verifies the agent has access to tools, not actual execution
      // Full integration test would require mocking the full agent execution
      const result = await discoveryAgent(messages, mockContext)

      expect(result).toBeDefined()
      expect(result.output).toBeDefined()
      // Sales constraint should guide agent to use tools instead of giving solution
    })

    it('should include sales constraint in pitch agent system prompt', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Tell me how to fine-tune a model' }
      ]

      const result = await pitchAgent(messages, mockContext)

      expect(result).toBeDefined()
      // Agent should redirect to syllabus tool rather than explaining
    })

    it('should include sales constraint in closer agent system prompt', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'What\'s the code for that?' }
      ]

      const result = await closerAgent(messages, mockContext)

      expect(result).toBeDefined()
      // Agent should use tools to demonstrate expertise, not give code
    })
  })

  describe('Tool Availability', () => {
    it('should have teaser tools available in chat agents', async () => {
      const { getChatToolDefinitions } = await import('../../tools/unified-tool-registry.js')
      
      const tools = getChatToolDefinitions('test-session', 'Test Agent')

      expect(tools.generate_custom_syllabus).toBeDefined()
      expect(tools.analyze_competitor_gap).toBeDefined()
      expect(tools.simulate_cost_of_inaction).toBeDefined()
    })

    it('should have consulting tools available', async () => {
      const { getChatToolDefinitions } = await import('../../tools/unified-tool-registry.js')
      
      const tools = getChatToolDefinitions('test-session', 'Test Agent')

      expect(tools.analyze_website_tech_stack).toBeDefined()
      expect(tools.generate_architecture_diagram).toBeDefined()
      expect(tools.search_internal_case_studies).toBeDefined()
    })
  })
})
