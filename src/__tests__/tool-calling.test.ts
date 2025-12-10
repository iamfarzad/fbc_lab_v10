/**
 * Tool Calling Tests
 * 
 * Tests for tool registration and execution (weather, location, stock prices)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeUnifiedTool, ToolSchemas, validateToolArgs } from '../core/tools/unified-tool-registry.js'

// Mock 'ai' package generateText used by searchWeb
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mocked search response',
    toolResults: [],
    response: {
      text: () => 'Mocked search response',
      headers: new Headers({
        'x-gemini-usage-token-count': '100',
        'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
      }),
      rawResponse: new Response(null, { status: 200 })
    },
    finishReason: 'stop'
  })
}))

// Mock ai-client
vi.mock('../../lib/ai-client.js', () => ({
  google: vi.fn(() => 'mock-model')
}))

// Mock tool implementations
vi.mock('../../../server/utils/tool-implementations.js', () => ({
  executeSearchWeb: vi.fn().mockResolvedValue({
    success: true,
    data: { query: 'test', results: [] }
  }),
  executeExtractActionItems: vi.fn().mockResolvedValue({
    success: true,
    data: { actionItems: [] }
  }),
  executeCalculateROI: vi.fn().mockResolvedValue({
    success: true,
    data: { roi: 2.5 }
  }),
  executeGenerateSummaryPreview: vi.fn().mockResolvedValue({
    success: true,
    data: { preview: 'Summary preview' }
  }),
  executeDraftFollowUpEmail: vi.fn().mockResolvedValue({
    success: true,
    data: { email: 'Draft email' }
  }),
  executeGenerateProposalDraft: vi.fn().mockResolvedValue({
    success: true,
    data: { proposal: 'Proposal draft' }
  }),
  executeCaptureScreenSnapshot: vi.fn().mockResolvedValue({
    success: true,
    data: { snapshot: 'base64-data' }
  }),
  executeCaptureWebcamSnapshot: vi.fn().mockResolvedValue({
    success: true,
    data: { snapshot: 'base64-data' }
  }),
  executeCaptureScreenSnapshotBySession: vi.fn().mockResolvedValue({
    success: true,
    data: { snapshot: 'base64-data' }
  }),
  executeCaptureWebcamSnapshotBySession: vi.fn().mockResolvedValue({
    success: true,
    data: { snapshot: 'base64-data' }
  }),
  executeGetDashboardStats: vi.fn().mockResolvedValue({
    success: true,
    data: { stats: {} }
  })
}))

vi.mock('../../services/unifiedContext.js', () => ({
  unifiedContext: {
    ensureLocation: vi.fn().mockResolvedValue({
      latitude: 37.7749,
      longitude: -122.4194,
      city: 'San Francisco',
      country: 'USA'
    }),
    getSnapshot: vi.fn().mockReturnValue({
      intelligenceContext: {
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          city: 'San Francisco',
          country: 'USA'
        }
      }
    })
  }
}))

describe('Tool Calling', () => {
  const mockContext = {
    sessionId: 'test-session',
    connectionId: 'test-connection',
    agent: 'test-agent'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Tool Registration', () => {
    it('should have weather tool registered', () => {
      expect(ToolSchemas.get_weather).toBeDefined()
      const validation = validateToolArgs('get_weather', { location: 'San Francisco' })
      expect(validation.valid).toBe(true)
    })

    it('should have location tool registered', () => {
      expect(ToolSchemas.get_location).toBeDefined()
      const validation = validateToolArgs('get_location', {})
      expect(validation.valid).toBe(true)
    })

    it('should have stock price tool registered', () => {
      expect(ToolSchemas.get_stock_price).toBeDefined()
      const validation = validateToolArgs('get_stock_price', { symbol: 'TSLA' })
      expect(validation.valid).toBe(true)
    })
  })

  describe('Tool Execution', () => {
    it('should execute weather tool', async () => {
      const result = await executeUnifiedTool(
        'get_weather',
        { location: 'San Francisco' },
        mockContext
      )

      expect(result.success).toBe(true)
    })

    it('should execute location tool', async () => {
      const result = await executeUnifiedTool(
        'get_location',
        {},
        mockContext
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('latitude')
      expect(result.data).toHaveProperty('longitude')
    })

    it('should execute stock price tool', async () => {
      const result = await executeUnifiedTool(
        'get_stock_price',
        { symbol: 'TSLA' },
        mockContext
      )

      expect(result.success).toBe(true)
    })
  })

  describe('Tool Validation', () => {
    it('should validate weather tool arguments', () => {
      const valid = validateToolArgs('get_weather', { location: 'New York' })
      expect(valid.valid).toBe(true)

      const invalid = validateToolArgs('get_weather', { location: '' })
      expect(invalid.valid).toBe(false)
    })

    it('should validate stock price tool arguments', () => {
      const valid = validateToolArgs('get_stock_price', { symbol: 'AAPL' })
      expect(valid.valid).toBe(true)

      const invalid = validateToolArgs('get_stock_price', { symbol: '' })
      expect(invalid.valid).toBe(false)
    })
  })
})
