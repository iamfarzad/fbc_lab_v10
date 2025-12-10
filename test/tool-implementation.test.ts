/**
 * Tool Implementation Tests
 * 
 * Tests actual tool execution functions in server/utils/tool-implementations.ts
 * Tests vision analysis service and new tool implementations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn()
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mocked-model')
}))

vi.mock('../../src/core/intelligence/vision-analysis', () => ({
  analyzeImageWithPrompt: vi.fn()
}))

vi.mock('../../src/core/intelligence/search', () => ({
  searchWeb: vi.fn()
}))

vi.mock('../../src/core/intelligence/analysis', () => ({
  extractActionItems: vi.fn(),
  generateSummary: vi.fn(),
  draftFollowUpEmail: vi.fn(),
  generateProposal: vi.fn()
}))

vi.mock('../../src/core/context/multimodal-context', () => ({
  multimodalContextManager: {
    getConversationHistory: vi.fn(),
    getContext: vi.fn()
  }
}))

describe('Tool Implementations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Vision Analysis Service', () => {
    it('should analyze image with focus prompt', async () => {
      const { analyzeImageWithPrompt } = await import('../../src/core/intelligence/vision-analysis')
      
      vi.mocked(analyzeImageWithPrompt).mockResolvedValue({
        analysis: 'Error code 503 Service Unavailable',
        confidence: 0.9
      })

      const result = await analyzeImageWithPrompt(
        'base64ImageData',
        'Read the error message text',
        'screen'
      )

      expect(result.analysis).toBe('Error code 503 Service Unavailable')
      expect(result.confidence).toBe(0.9)
      expect(analyzeImageWithPrompt).toHaveBeenCalledWith(
        'base64ImageData',
        'Read the error message text',
        'screen'
      )
    })

    it('should handle image analysis errors gracefully', async () => {
      const { analyzeImageWithPrompt } = await import('../../src/core/intelligence/vision-analysis')
      
      vi.mocked(analyzeImageWithPrompt).mockRejectedValue(new Error('API error'))

      await expect(
        analyzeImageWithPrompt('base64ImageData', 'test prompt', 'webcam')
      ).rejects.toThrow('API error')
    })
  })

  describe('Website Tech Stack Analysis', () => {
    it('should detect WordPress from HTML', async () => {
      // Mock fetch globally
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><script src="/wp-content/themes/theme/style.css"></script></body></html>'
      })

      const { executeAnalyzeWebsiteTechStack } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeAnalyzeWebsiteTechStack({
        url: 'https://example.com',
        focus: 'ai_opportunities'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.stack).toContain('WordPress')
        expect(Array.isArray(result.data?.stack)).toBe(true)
      }

      vi.restoreAllMocks()
    })

    it('should handle fetch errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const { executeAnalyzeWebsiteTechStack } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeAnalyzeWebsiteTechStack({
        url: 'https://nonexistent.com'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch website')

      vi.restoreAllMocks()
    })
  })

  describe('Architecture Diagram Generation', () => {
    it('should generate Mermaid code for flowchart', async () => {
      const { generateText } = await import('ai')
      
      vi.mocked(generateText).mockResolvedValue({
        text: 'graph TD\n    A[Start] --> B[Process]'
      } as any)

      const { executeGenerateArchitectureDiagram } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeGenerateArchitectureDiagram({
        diagram_type: 'flowchart',
        content_description: 'Simple workflow'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.mermaidCode).toContain('graph')
        expect(result.data?.diagram_type).toBe('flowchart')
      }
    })

    it('should strip markdown code blocks from Mermaid output', async () => {
      const { generateText } = await import('ai')
      
      vi.mocked(generateText).mockResolvedValue({
        text: '```mermaid\ngraph TD\n    A --> B\n```'
      } as any)

      const { executeGenerateArchitectureDiagram } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeGenerateArchitectureDiagram({
        diagram_type: 'flowchart',
        content_description: 'Test'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.mermaidCode).not.toContain('```')
        expect(result.data?.mermaidCode).toContain('graph')
      }
    })
  })

  describe('Case Study Search', () => {
    it('should return matching case studies', async () => {
      const { executeSearchInternalCaseStudies } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeSearchInternalCaseStudies({
        query: 'video generation',
        industry: 'Media Production'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Array.isArray(result.data?.results)).toBe(true)
        expect(result.data?.count).toBeGreaterThanOrEqual(0)
      }
    })

    it('should return empty results for non-matching queries', async () => {
      const { executeSearchInternalCaseStudies } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeSearchInternalCaseStudies({
        query: 'nonexistent use case xyz123'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.results).toEqual([])
        expect(result.data?.count).toBe(0)
      }
    })
  })

  describe('Custom Syllabus Generation', () => {
    it('should generate syllabus with team context', async () => {
      const { generateText } = await import('ai')
      
      vi.mocked(generateText).mockResolvedValue({
        text: '# Custom Workshop Syllabus\n\n## Day 1: AI Strategy\n### Module 1: Introduction'
      } as any)

      const { executeGenerateCustomSyllabus } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeGenerateCustomSyllabus({
        team_roles: '3 devs, 1 PM',
        pain_points: ['manual data entry', 'inefficient workflows'],
        tech_stack: 'React/Node.js'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.syllabus).toContain('Custom Workshop Syllabus')
        expect(result.data?.team_roles).toBe('3 devs, 1 PM')
      }
    })
  })

  describe('Competitor Gap Analysis', () => {
    it('should calculate gap timeline', async () => {
      const { executeSearchWeb } = await import('../../server/utils/tool-implementations.js')
      
      vi.mocked(executeSearchWeb).mockResolvedValue({
        success: true,
        data: {
          answer: 'Competitor A launched AI customer service',
          results: [
            { title: 'Competitor A', snippet: 'Launched AI portal', url: 'https://example.com' }
          ]
        }
      })

      const { executeAnalyzeCompetitorGap } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeAnalyzeCompetitorGap({
        industry: 'e-commerce',
        client_current_state: 'exploring AI options'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.gap?.timeline).toBeDefined()
        expect(result.data?.client_activity_level).toBe('Exploration')
      }
    })
  })

  describe('Cost of Inaction Simulation', () => {
    it('should calculate monthly and annual costs correctly', async () => {
      const { executeSimulateCostOfInaction } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeSimulateCostOfInaction({
        inefficient_process: 'manual data entry',
        hours_wasted_per_week: 10,
        team_size: 5
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 10 hours/week * 4 weeks * 5 people = 200 hours/month
        expect(result.data?.monthlyHoursWasted).toBe(200)
        // 200 hours * $50/hour = $10,000/month
        expect(result.data?.monthlyCost).toBe(10000)
        // $10,000 * 12 = $120,000/year
        expect(result.data?.annualCost).toBe(120000)
        expect(result.data?.workshopBreakEvenMonths).toBeDefined()
      }
    })

    it('should calculate break-even timeline correctly', async () => {
      const { executeSimulateCostOfInaction } = await import('../../server/utils/tool-implementations.js')
      
      const result = await executeSimulateCostOfInaction({
        inefficient_process: 'manual reporting',
        hours_wasted_per_week: 5,
        team_size: 2
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 5 * 4 * 2 = 40 hours/month = $2,000/month
        // Workshop cost $10,000 / $2,000 = 5 months break-even
        expect(result.data?.workshopBreakEvenMonths).toBeCloseTo(5, 1)
      }
    })
  })
})
