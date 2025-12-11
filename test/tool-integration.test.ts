/**
 * Tool Integration Tests
 * 
 * Tests the unified tool registry for:
 * - Schema validation (Zod validation catches invalid args)
 * - Tool name constants
 * - Transient error detection
 * - Chat tool definitions structure
 * 
 * Note: Execution tests require complex mocking of dynamic imports.
 * Integration tests for actual tool execution are handled in e2e tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateToolArgs,
  getChatToolDefinitions,
  isTransientError,
  UNIFIED_TOOL_NAMES,
  ToolSchemas
} from '../src/core/tools/unified-tool-registry'

// Mock toolExecutor for getChatToolDefinitions tests
vi.mock('../src/core/tools/tool-executor', () => ({
  toolExecutor: {
    execute: vi.fn().mockImplementation(async ({ handler }) => {
      try {
        const result = await handler()
        return { success: true, data: result, duration: 100, cached: false, attempt: 1 }
      } catch (error) {
        return { success: false, error: (error as Error).message, duration: 100, cached: false, attempt: 1 }
      }
    })
  }
}))

// Mock code-quality utilities
vi.mock('../src/lib/code-quality', () => ({
  withTimeout: vi.fn().mockImplementation((promise) => promise),
  retry: vi.fn().mockImplementation((fn) => fn()),
  createError: vi.fn().mockImplementation((message, code) => new Error(`${code}: ${message}`))
}))

describe('Unified Tool Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('validateToolArgs', () => {
    it('should validate search_web args correctly', () => {
      // Valid args
      const validResult = validateToolArgs('search_web', { query: 'test query' })
      expect(validResult.valid).toBe(true)
      expect(validResult.error).toBeUndefined()

      // Valid with optional urls
      const validWithUrls = validateToolArgs('search_web', {
        query: 'test query',
        urls: ['https://example.com']
      })
      expect(validWithUrls.valid).toBe(true)

      // Invalid - empty query
      const invalidEmpty = validateToolArgs('search_web', { query: '' })
      expect(invalidEmpty.valid).toBe(false)
      expect(invalidEmpty.error).toContain('Query cannot be empty')

      // Invalid - missing query
      const invalidMissing = validateToolArgs('search_web', {})
      expect(invalidMissing.valid).toBe(false)
    })

    it('should validate calculate_roi args correctly', () => {
      // Valid - all optional, empty object is fine
      const validEmpty = validateToolArgs('calculate_roi', {})
      expect(validEmpty.valid).toBe(true)

      // Valid - with numeric values
      const validWithValues = validateToolArgs('calculate_roi', {
        currentCost: 10000,
        timeSavings: 100,
        employeeCostPerHour: 50
      })
      expect(validWithValues.valid).toBe(true)
    })

    it('should validate draft_follow_up_email args correctly', () => {
      // Valid args
      const validResult = validateToolArgs('draft_follow_up_email', {
        recipient: 'client',
        tone: 'professional'
      })
      expect(validResult.valid).toBe(true)

      // Invalid - wrong recipient enum
      const invalidRecipient = validateToolArgs('draft_follow_up_email', {
        recipient: 'invalid',
        tone: 'professional'
      })
      expect(invalidRecipient.valid).toBe(false)

      // Invalid - wrong tone enum
      const invalidTone = validateToolArgs('draft_follow_up_email', {
        recipient: 'client',
        tone: 'invalid'
      })
      expect(invalidTone.valid).toBe(false)
    })

    it('should validate capture_screen_snapshot args correctly', () => {
      // Valid - empty object
      const validEmpty = validateToolArgs('capture_screen_snapshot', {})
      expect(validEmpty.valid).toBe(true)

      // Valid - with summaryOnly
      const validWithSummary = validateToolArgs('capture_screen_snapshot', {
        summaryOnly: true
      })
      expect(validWithSummary.valid).toBe(true)
    })

    it('should validate capture_webcam_snapshot args correctly', () => {
      // Valid - empty object
      const validEmpty = validateToolArgs('capture_webcam_snapshot', {})
      expect(validEmpty.valid).toBe(true)

      // Valid - with summaryOnly
      const validWithSummary = validateToolArgs('capture_webcam_snapshot', {
        summaryOnly: false
      })
      expect(validWithSummary.valid).toBe(true)

      // Valid - with focus_prompt
      const validWithFocus = validateToolArgs('capture_webcam_snapshot', {
        focus_prompt: 'What object are they holding?'
      })
      expect(validWithFocus.valid).toBe(true)

      // Valid - with both focus_prompt and summaryOnly
      const validWithBoth = validateToolArgs('capture_webcam_snapshot', {
        focus_prompt: 'Describe their facial expression',
        summaryOnly: true
      })
      expect(validWithBoth.valid).toBe(true)
    })

    it('should validate capture_screen_snapshot with focus_prompt correctly', () => {
      // Valid - empty object
      const validEmpty = validateToolArgs('capture_screen_snapshot', {})
      expect(validEmpty.valid).toBe(true)

      // Valid - with focus_prompt
      const validWithFocus = validateToolArgs('capture_screen_snapshot', {
        focus_prompt: 'Read the error message in the red box'
      })
      expect(validWithFocus.valid).toBe(true)

      // Valid - with both
      const validWithBoth = validateToolArgs('capture_screen_snapshot', {
        focus_prompt: 'What is the Q3 number?',
        summaryOnly: false
      })
      expect(validWithBoth.valid).toBe(true)
    })

    it('should validate get_dashboard_stats args correctly', () => {
      // Valid - empty object
      const validEmpty = validateToolArgs('get_dashboard_stats', {})
      expect(validEmpty.valid).toBe(true)

      // Valid - with period
      const validWithPeriod = validateToolArgs('get_dashboard_stats', {
        period: '7d'
      })
      expect(validWithPeriod.valid).toBe(true)

      // Valid - all period options
      const periods = ['1d', '7d', '30d', '90d']
      for (const period of periods) {
        const result = validateToolArgs('get_dashboard_stats', { period })
        expect(result.valid).toBe(true)
      }

      // Invalid - wrong period enum
      const invalidPeriod = validateToolArgs('get_dashboard_stats', {
        period: 'invalid'
      })
      expect(invalidPeriod.valid).toBe(false)
    })

    it('should validate analyze_website_tech_stack args correctly', () => {
      // Valid - with url
      const validResult = validateToolArgs('analyze_website_tech_stack', {
        url: 'https://example.com'
      })
      expect(validResult.valid).toBe(true)

      // Valid - with url and focus
      const validWithFocus = validateToolArgs('analyze_website_tech_stack', {
        url: 'https://example.com',
        focus: 'ai_opportunities'
      })
      expect(validWithFocus.valid).toBe(true)

      // Valid - with marketing_stack focus
      const validMarketing = validateToolArgs('analyze_website_tech_stack', {
        url: 'https://example.com',
        focus: 'marketing_stack'
      })
      expect(validMarketing.valid).toBe(true)

      // Invalid - missing url
      const invalidMissing = validateToolArgs('analyze_website_tech_stack', {})
      expect(invalidMissing.valid).toBe(false)

      // Invalid - invalid url
      const invalidUrl = validateToolArgs('analyze_website_tech_stack', {
        url: 'not-a-url'
      })
      expect(invalidUrl.valid).toBe(false)

      // Invalid - wrong focus enum
      const invalidFocus = validateToolArgs('analyze_website_tech_stack', {
        url: 'https://example.com',
        focus: 'invalid'
      })
      expect(invalidFocus.valid).toBe(false)
    })

    it('should validate generate_architecture_diagram args correctly', () => {
      // Valid - with required fields
      const validResult = validateToolArgs('generate_architecture_diagram', {
        diagram_type: 'flowchart',
        content_description: 'Workflow for video automation'
      })
      expect(validResult.valid).toBe(true)

      // Valid - all diagram types
      const diagramTypes = ['flowchart', 'sequence', 'gantt', 'mindmap']
      for (const type of diagramTypes) {
        const result = validateToolArgs('generate_architecture_diagram', {
          diagram_type: type,
          content_description: 'Test description'
        })
        expect(result.valid).toBe(true)
      }

      // Invalid - missing diagram_type
      const invalidMissing = validateToolArgs('generate_architecture_diagram', {
        content_description: 'Test'
      })
      expect(invalidMissing.valid).toBe(false)

      // Invalid - missing content_description
      const invalidMissingDesc = validateToolArgs('generate_architecture_diagram', {
        diagram_type: 'flowchart'
      })
      expect(invalidMissingDesc.valid).toBe(false)

      // Invalid - wrong diagram_type enum
      const invalidType = validateToolArgs('generate_architecture_diagram', {
        diagram_type: 'invalid',
        content_description: 'Test'
      })
      expect(invalidType.valid).toBe(false)
    })

    it('should validate search_internal_case_studies args correctly', () => {
      // Valid - with query
      const validResult = validateToolArgs('search_internal_case_studies', {
        query: 'customer support'
      })
      expect(validResult.valid).toBe(true)

      // Valid - with query and industry
      const validWithIndustry = validateToolArgs('search_internal_case_studies', {
        query: 'video generation',
        industry: 'media'
      })
      expect(validWithIndustry.valid).toBe(true)

      // Invalid - missing query
      const invalidMissing = validateToolArgs('search_internal_case_studies', {})
      expect(invalidMissing.valid).toBe(false)
    })

    it('should validate generate_custom_syllabus args correctly', () => {
      // Valid - with all required fields
      const validResult = validateToolArgs('generate_custom_syllabus', {
        team_roles: '3 devs, 1 PM',
        pain_points: ['manual data entry', 'inefficient workflows'],
        tech_stack: 'React/Node.js'
      })
      expect(validResult.valid).toBe(true)

      // Valid - with empty pain_points array
      const validEmptyArray = validateToolArgs('generate_custom_syllabus', {
        team_roles: '5 engineers',
        pain_points: [],
        tech_stack: 'Python'
      })
      expect(validEmptyArray.valid).toBe(true)

      // Invalid - missing team_roles
      const invalidMissing = validateToolArgs('generate_custom_syllabus', {
        pain_points: ['test'],
        tech_stack: 'Test'
      })
      expect(invalidMissing.valid).toBe(false)

      // Invalid - missing pain_points
      const invalidMissingPain = validateToolArgs('generate_custom_syllabus', {
        team_roles: '5 engineers',
        tech_stack: 'Test'
      })
      expect(invalidMissingPain.valid).toBe(false)

      // Invalid - missing tech_stack
      const invalidMissingTech = validateToolArgs('generate_custom_syllabus', {
        team_roles: '5 engineers',
        pain_points: ['test']
      })
      expect(invalidMissingTech.valid).toBe(false)
    })

    it('should validate analyze_competitor_gap args correctly', () => {
      // Valid - with all required fields
      const validResult = validateToolArgs('analyze_competitor_gap', {
        industry: 'e-commerce',
        client_current_state: 'exploring AI options'
      })
      expect(validResult.valid).toBe(true)

      // Invalid - missing industry
      const invalidMissing = validateToolArgs('analyze_competitor_gap', {
        client_current_state: 'test'
      })
      expect(invalidMissing.valid).toBe(false)

      // Invalid - missing client_current_state
      const invalidMissingState = validateToolArgs('analyze_competitor_gap', {
        industry: 'test'
      })
      expect(invalidMissingState.valid).toBe(false)
    })

    it('should validate simulate_cost_of_inaction args correctly', () => {
      // Valid - with all required fields
      const validResult = validateToolArgs('simulate_cost_of_inaction', {
        inefficient_process: 'manual data entry',
        hours_wasted_per_week: 10,
        team_size: 5
      })
      expect(validResult.valid).toBe(true)

      // Invalid - missing inefficient_process
      const invalidMissing = validateToolArgs('simulate_cost_of_inaction', {
        hours_wasted_per_week: 10,
        team_size: 5
      })
      expect(invalidMissing.valid).toBe(false)

      // Invalid - missing hours_wasted_per_week
      const invalidMissingHours = validateToolArgs('simulate_cost_of_inaction', {
        inefficient_process: 'test',
        team_size: 5
      })
      expect(invalidMissingHours.valid).toBe(false)

      // Invalid - missing team_size
      const invalidMissingSize = validateToolArgs('simulate_cost_of_inaction', {
        inefficient_process: 'test',
        hours_wasted_per_week: 10
      })
      expect(invalidMissingSize.valid).toBe(false)

      // Invalid - non-numeric hours_wasted_per_week
      const invalidHoursType = validateToolArgs('simulate_cost_of_inaction', {
        inefficient_process: 'test',
        hours_wasted_per_week: 'not-a-number',
        team_size: 5
      })
      expect(invalidHoursType.valid).toBe(false)

      // Invalid - non-numeric team_size
      const invalidSizeType = validateToolArgs('simulate_cost_of_inaction', {
        inefficient_process: 'test',
        hours_wasted_per_week: 10,
        team_size: 'not-a-number'
      })
      expect(invalidSizeType.valid).toBe(false)
    })

    it('should validate generate_executive_memo args correctly', () => {
      // Valid - with all required fields
      const validResult = validateToolArgs('generate_executive_memo', {
        target_audience: 'CFO',
        key_blocker: 'budget',
        proposed_solution: '2-Day In-House Workshop'
      })
      expect(validResult.valid).toBe(true)

      // Valid - all audience types
      const audiences = ['CFO', 'CEO', 'CTO']
      for (const audience of audiences) {
        const result = validateToolArgs('generate_executive_memo', {
          target_audience: audience,
          key_blocker: 'budget',
          proposed_solution: 'Test solution'
        })
        expect(result.valid).toBe(true)
      }

      // Valid - all blocker types
      const blockers = ['budget', 'timing', 'security']
      for (const blocker of blockers) {
        const result = validateToolArgs('generate_executive_memo', {
          target_audience: 'CFO',
          key_blocker: blocker,
          proposed_solution: 'Test solution'
        })
        expect(result.valid).toBe(true)
      }

      // Invalid - missing target_audience
      const invalidMissingAudience = validateToolArgs('generate_executive_memo', {
        key_blocker: 'budget',
        proposed_solution: 'Test'
      })
      expect(invalidMissingAudience.valid).toBe(false)

      // Invalid - missing key_blocker
      const invalidMissingBlocker = validateToolArgs('generate_executive_memo', {
        target_audience: 'CFO',
        proposed_solution: 'Test'
      })
      expect(invalidMissingBlocker.valid).toBe(false)

      // Invalid - missing proposed_solution
      const invalidMissingSolution = validateToolArgs('generate_executive_memo', {
        target_audience: 'CFO',
        key_blocker: 'budget'
      })
      expect(invalidMissingSolution.valid).toBe(false)

      // Invalid - wrong target_audience enum
      const invalidAudience = validateToolArgs('generate_executive_memo', {
        target_audience: 'INVALID',
        key_blocker: 'budget',
        proposed_solution: 'Test'
      })
      expect(invalidAudience.valid).toBe(false)

      // Invalid - wrong key_blocker enum
      const invalidBlocker = validateToolArgs('generate_executive_memo', {
        target_audience: 'CFO',
        key_blocker: 'INVALID',
        proposed_solution: 'Test'
      })
      expect(invalidBlocker.valid).toBe(false)
    })

    it('should validate extract_action_items args correctly', () => {
      // Valid - empty object (no required params)
      const validEmpty = validateToolArgs('extract_action_items', {})
      expect(validEmpty.valid).toBe(true)
    })

    it('should validate generate_summary_preview args correctly', () => {
      // Valid - empty object
      const validEmpty = validateToolArgs('generate_summary_preview', {})
      expect(validEmpty.valid).toBe(true)

      // Valid - with options
      const validWithOptions = validateToolArgs('generate_summary_preview', {
        includeRecommendations: true,
        includeNextSteps: false
      })
      expect(validWithOptions.valid).toBe(true)
    })

    it('should validate generate_proposal_draft args correctly', () => {
      // Valid - empty object (no required params)
      const validEmpty = validateToolArgs('generate_proposal_draft', {})
      expect(validEmpty.valid).toBe(true)
    })

    it('should reject unknown tools', () => {
      const result = validateToolArgs('unknown_tool', {})
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unknown tool')
    })

    it('should handle null/undefined args gracefully', () => {
      // Most tools accept empty args
      const resultNull = validateToolArgs('extract_action_items', null)
      expect(resultNull.valid).toBe(true)

      const resultUndefined = validateToolArgs('extract_action_items', undefined)
      expect(resultUndefined.valid).toBe(true)
    })
  })

  describe('getChatToolDefinitions', () => {
    it('should return tool definitions for chat', () => {
      const tools = getChatToolDefinitions('test-session', 'Test Agent')

      // Should have unified tools (including webcam/screen for chat via session-based lookup)
      expect(tools.search_web).toBeDefined()
      expect(tools.calculate_roi).toBeDefined()
      expect(tools.extract_action_items).toBeDefined()
      expect(tools.generate_summary_preview).toBeDefined()
      expect(tools.draft_follow_up_email).toBeDefined()
      expect(tools.generate_proposal_draft).toBeDefined()
      expect(tools.capture_webcam_snapshot).toBeDefined()
      expect(tools.capture_screen_snapshot).toBeDefined()

      // Admin-only tools should not be included
      expect(tools.get_dashboard_stats).toBeUndefined()
    })

    it('should return tools with correct structure', () => {
      const tools = getChatToolDefinitions('test-session', 'Test Agent')

      for (const toolName of Object.keys(tools)) {
        const tool = tools[toolName]
        expect(tool.description).toBeDefined()
        expect(typeof tool.description).toBe('string')
        expect(tool.parameters).toBeDefined()
        expect(tool.execute).toBeDefined()
        expect(typeof tool.execute).toBe('function')
      }
    })

    it('should return consistent tools for same session', () => {
      const tools1 = getChatToolDefinitions('test-session', 'Agent 1')
      const tools2 = getChatToolDefinitions('test-session', 'Agent 2')

      // Both should have the same tool names
      expect(Object.keys(tools1)).toEqual(Object.keys(tools2))

      // Descriptions should be the same
      expect(tools1.search_web.description).toEqual(tools2.search_web.description)
    })
  })

  describe('isTransientError', () => {
    it('should identify network errors as transient', () => {
      expect(isTransientError(new Error('network failure'))).toBe(true)
      expect(isTransientError(new Error('Network error occurred'))).toBe(true)
    })

    it('should identify timeout errors as transient', () => {
      expect(isTransientError(new Error('timeout occurred'))).toBe(true)
      expect(isTransientError(new Error('Request timeout'))).toBe(true)
    })

    it('should identify connection errors as transient', () => {
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true)
      expect(isTransientError(new Error('ENOTFOUND'))).toBe(true)
      expect(isTransientError(new Error('ECONNREFUSED'))).toBe(true)
    })

    it('should identify temporary failures as transient', () => {
      expect(isTransientError(new Error('temporary failure'))).toBe(true)
    })

    it('should identify rate limiting as transient', () => {
      expect(isTransientError(new Error('rate limit exceeded'))).toBe(true)
      expect(isTransientError(new Error('429 Too Many Requests'))).toBe(true)
    })

    it('should identify server errors as transient', () => {
      expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true)
      expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true)
    })

    it('should not identify validation errors as transient', () => {
      expect(isTransientError(new Error('validation failed'))).toBe(false)
      expect(isTransientError(new Error('invalid argument'))).toBe(false)
      expect(isTransientError(new Error('permission denied'))).toBe(false)
      expect(isTransientError(new Error('not found'))).toBe(false)
    })

    it('should handle non-Error values', () => {
      expect(isTransientError('string error')).toBe(false)
      expect(isTransientError(null)).toBe(false)
      expect(isTransientError(undefined)).toBe(false)
      expect(isTransientError(123)).toBe(false)
      expect(isTransientError({})).toBe(false)
    })
  })

  describe('UNIFIED_TOOL_NAMES', () => {
    it('should contain all tools', () => {
      expect(UNIFIED_TOOL_NAMES.length).toBeGreaterThanOrEqual(11)
      expect(UNIFIED_TOOL_NAMES.length).toBe(Object.keys(ToolSchemas).length)
    })

    it('should contain core business tools', () => {
      expect(UNIFIED_TOOL_NAMES).toContain('search_web')
      expect(UNIFIED_TOOL_NAMES).toContain('calculate_roi')
    })

    it('should contain search and location tools', () => {
      expect(UNIFIED_TOOL_NAMES).toContain('get_weather')
      expect(UNIFIED_TOOL_NAMES).toContain('search_companies_by_location')
    })

    it('should contain conversation tools', () => {
      expect(UNIFIED_TOOL_NAMES).toContain('extract_action_items')
      expect(UNIFIED_TOOL_NAMES).toContain('generate_summary_preview')
      expect(UNIFIED_TOOL_NAMES).toContain('draft_follow_up_email')
      expect(UNIFIED_TOOL_NAMES).toContain('generate_proposal_draft')
    })

    it('should contain multimodal tools', () => {
      expect(UNIFIED_TOOL_NAMES).toContain('capture_screen_snapshot')
      expect(UNIFIED_TOOL_NAMES).toContain('capture_webcam_snapshot')
    })

    it('should contain admin tools', () => {
      expect(UNIFIED_TOOL_NAMES).toContain('get_dashboard_stats')
      expect(UNIFIED_TOOL_NAMES).toContain('analyze_website_tech_stack')
      expect(UNIFIED_TOOL_NAMES).toContain('generate_architecture_diagram')
      expect(UNIFIED_TOOL_NAMES).toContain('search_internal_case_studies')
      expect(UNIFIED_TOOL_NAMES).toContain('generate_custom_syllabus')
      expect(UNIFIED_TOOL_NAMES).toContain('analyze_competitor_gap')
      expect(UNIFIED_TOOL_NAMES).toContain('simulate_cost_of_inaction')
      expect(UNIFIED_TOOL_NAMES).toContain('generate_executive_memo')
    })
  })

  describe('ToolSchemas', () => {
    it('should export schemas for all tools', () => {
      expect(Object.keys(ToolSchemas).length).toBeGreaterThanOrEqual(11)
      expect(Object.keys(ToolSchemas).length).toBe(UNIFIED_TOOL_NAMES.length)
    })

    it('should have schema for each unified tool', () => {
      for (const toolName of UNIFIED_TOOL_NAMES) {
        expect(ToolSchemas[toolName]).toBeDefined()
      }
    })
  })
})

describe('Schema Validation Edge Cases', () => {
  it('should handle string coercion for boolean fields', () => {
    // Boolean preprocess should handle string "true" and "false"
    const resultTrue = validateToolArgs('capture_screen_snapshot', { summaryOnly: 'true' })
    expect(resultTrue.valid).toBe(true)

    const resultFalse = validateToolArgs('capture_screen_snapshot', { summaryOnly: 'false' })
    expect(resultFalse.valid).toBe(true)
  })

  it('should handle string coercion for numeric fields', () => {
    // Numeric preprocess should handle string numbers
    const result = validateToolArgs('calculate_roi', {
      currentCost: '10000',
      timeSavings: '100'
    })
    expect(result.valid).toBe(true)
  })

  it('should handle empty strings as undefined for optional fields', () => {
    const result = validateToolArgs('calculate_roi', {
      currentCost: '',
      timeSavings: ''
    })
    expect(result.valid).toBe(true)
  })

  it('should reject invalid URL format in search_web urls array', () => {
    const result = validateToolArgs('search_web', {
      query: 'test',
      urls: ['not-a-url']
    })
    expect(result.valid).toBe(false)
  })

  it('should accept valid URLs in search_web urls array', () => {
    const result = validateToolArgs('search_web', {
      query: 'test',
      urls: ['https://example.com', 'http://test.org']
    })
    expect(result.valid).toBe(true)
  })
})
