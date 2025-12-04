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

      // Should have unified tools (excluding voice-only tools)
      expect(tools.search_web).toBeDefined()
      expect(tools.calculate_roi).toBeDefined()
      expect(tools.extract_action_items).toBeDefined()
      expect(tools.generate_summary_preview).toBeDefined()
      expect(tools.draft_follow_up_email).toBeDefined()
      expect(tools.generate_proposal_draft).toBeDefined()

      // Voice-only tools should not be included
      expect(tools.capture_screen_snapshot).toBeUndefined()
      expect(tools.capture_webcam_snapshot).toBeUndefined()
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
    it('should contain all 9 tools', () => {
      expect(UNIFIED_TOOL_NAMES).toHaveLength(9)
    })

    it('should contain core business tools', () => {
      expect(UNIFIED_TOOL_NAMES).toContain('search_web')
      expect(UNIFIED_TOOL_NAMES).toContain('calculate_roi')
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
    })
  })

  describe('ToolSchemas', () => {
    it('should export schemas for all tools', () => {
      expect(Object.keys(ToolSchemas)).toHaveLength(9)
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
