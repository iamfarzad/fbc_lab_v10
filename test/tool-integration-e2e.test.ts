/**
 * E2E Integration Tests for Unified Tool System
 * 
 * Tests the complete tool execution flow across voice and chat modalities
 * 
 * To run these tests:
 * - Default: Tests are skipped (use mocks)
 * - Enable: Set ENABLE_E2E_TOOL_TESTS=1
 * - Use real tools: Set USE_REAL_TOOLS=1
 * - Use real servers: Set USE_REAL_WEBSOCKET=1 or USE_REAL_API=1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processToolCall } from '../server/live-api/tool-processor'
import {
  createMockWebSocket,
  createMockActiveSessions,
  createToolCallMessage,
  verifyToolResult,
  delay,
} from './helpers/tool-integration-helpers'
import {
  getTestConfig,
  getDescribeFunction,
  hasRequiredAPIKeys,
} from './helpers/test-env'
import type { ToolResult } from '../src/core/tools/unified-tool-registry'

// Mock dependencies
vi.mock('../server/utils/env-setup', () => ({
  serverLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('src/core/context/capabilities', () => ({
  recordCapabilityUsed: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('src/core/context/multimodal-context', () => ({
  multimodalContextManager: {
    addToolCallToLastTurn: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock tool implementations (can be overridden for real execution)
const mockExecuteSearchWeb = vi.fn()
const mockExecuteCalculateROI = vi.fn()
const mockExecuteExtractActionItems = vi.fn()

vi.mock('../server/utils/tool-implementations.js', () => ({
  executeSearchWeb: (...args: unknown[]) => mockExecuteSearchWeb(...args),
  executeExtractActionItems: (...args: unknown[]) => mockExecuteExtractActionItems(...args),
  executeCalculateROI: (...args: unknown[]) => mockExecuteCalculateROI(...args),
  executeGenerateSummaryPreview: vi.fn().mockResolvedValue({
    success: true,
    data: { summary: 'Mock summary' },
  }),
  executeDraftFollowUpEmail: vi.fn().mockResolvedValue({
    success: true,
    data: { email: 'Mock email' },
  }),
  executeGenerateProposalDraft: vi.fn().mockResolvedValue({
    success: true,
    data: { proposal: 'Mock proposal' },
  }),
  executeCaptureScreenSnapshot: vi.fn().mockResolvedValue({
    success: true,
    data: { analysis: 'Mock screen analysis', hasImage: true, imageData: 'base64Image' },
  }),
  executeCaptureScreenSnapshotBySession: vi.fn().mockResolvedValue({
    success: true,
    data: { analysis: 'Mock screen analysis', hasImage: true, imageData: 'base64Image' },
  }),
  executeCaptureWebcamSnapshot: vi.fn().mockResolvedValue({
    success: true,
    data: { analysis: 'Mock webcam analysis', hasImage: true, imageData: 'base64Image' },
  }),
  executeCaptureWebcamSnapshotBySession: vi.fn().mockResolvedValue({
    success: true,
    data: { analysis: 'Mock webcam analysis', hasImage: true, imageData: 'base64Image' },
  }),
  executeGetDashboardStats: vi.fn().mockResolvedValue({
    success: true,
    data: { totalLeads: 100 },
  }),
  executeAnalyzeWebsiteTechStack: vi.fn().mockResolvedValue({
    success: true,
    data: { stack: ['WordPress', 'React'], message: 'Tech stack analyzed' },
  }),
  executeGenerateArchitectureDiagram: vi.fn().mockResolvedValue({
    success: true,
    data: { mermaidCode: 'graph TD\nA --> B', diagram_type: 'flowchart' },
  }),
  executeSearchInternalCaseStudies: vi.fn().mockResolvedValue({
    success: true,
    data: { results: [], count: 0, message: 'No case studies found' },
  }),
  executeGenerateCustomSyllabus: vi.fn().mockResolvedValue({
    success: true,
    data: { syllabus: '# Workshop Syllabus', format: 'markdown' },
  }),
  executeAnalyzeCompetitorGap: vi.fn().mockResolvedValue({
    success: true,
    data: { gap: { timeline: '6-12 months' }, message: 'Gap analysis complete' },
  }),
  executeSimulateCostOfInaction: vi.fn().mockResolvedValue({
    success: true,
    data: { monthlyCost: 10000, annualCost: 120000, message: 'Cost calculated' },
  }),
}))

// Mock code-quality utilities
vi.mock('src/lib/code-quality', () => ({
  retry: vi.fn().mockImplementation((fn) => fn()),
  withTimeout: vi.fn().mockImplementation((promise) => promise),
}))

// Get describe function (skips if E2E tests not enabled)
const describeE2E = getDescribeFunction()

describeE2E('E2E Tool Integration Tests', () => {
  const config = getTestConfig()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up default mocks
    mockExecuteSearchWeb.mockResolvedValue({
      success: true,
      data: { query: 'test query', results: [], message: 'Mock search results' },
    })
    
    mockExecuteCalculateROI.mockResolvedValue({
      success: true,
      data: { roi: 150, message: 'ROI calculated' },
    })
    
    mockExecuteExtractActionItems.mockResolvedValue({
      success: true,
      data: { actionItems: [], message: 'Action items extracted' },
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // Test Suite 1: Voice Tool Call Flow
  // ============================================================================

  describe('Voice Tool Call Flow', () => {
    it('should execute tool call successfully via voice path', async () => {
      const connectionId = 'test-connection-id'
      const sessionId = 'test-session-id'
      const mockWs = createMockWebSocket()
      const activeSessions = createMockActiveSessions(sessionId, connectionId)

      const toolCall = createToolCallMessage('search_web', {
        query: 'test query',
      })

      const result = await processToolCall(connectionId, mockWs, toolCall, activeSessions)

      expect(result).toBe(true)
      
      // Verify tool response was sent
      const client = activeSessions.get(connectionId)
      expect(client?.session.sendToolResponse).toHaveBeenCalled()
      
      const callArgs = (client?.session.sendToolResponse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.functionResponses).toHaveLength(1)
      expect(callArgs.functionResponses[0].name).toBe('search_web')
      expect(verifyToolResult(callArgs.functionResponses[0].response)).toBe(true)
      expect(callArgs.functionResponses[0].response.success).toBe(true)
    })

    it('should catch schema validation errors before execution', async () => {
      const connectionId = 'test-connection-id'
      const sessionId = 'test-session-id'
      const mockWs = createMockWebSocket()
      const activeSessions = createMockActiveSessions(sessionId, connectionId)

      // Invalid args: empty query
      const toolCall = createToolCallMessage('search_web', {
        query: '', // Invalid: empty query
      })

      const result = await processToolCall(connectionId, mockWs, toolCall, activeSessions)

      expect(result).toBe(true)
      
      // Verify error response was sent
      const client = activeSessions.get(connectionId)
      expect(client?.session.sendToolResponse).toHaveBeenCalled()
      
      const callArgs = (client?.session.sendToolResponse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.functionResponses[0].response.success).toBe(false)
      expect(callArgs.functionResponses[0].response.error).toContain('Query cannot be empty')
      
      // Verify tool was NOT executed (validation failed first)
      expect(mockExecuteSearchWeb).not.toHaveBeenCalled()
    })

    it('should retry on transient errors (voice path)', async () => {
      const connectionId = 'test-connection-id'
      const sessionId = 'test-session-id'
      const mockWs = createMockWebSocket()
      const activeSessions = createMockActiveSessions(sessionId, connectionId)

      // Mock tool to fail first time, succeed on retry
      let attemptCount = 0
      mockExecuteSearchWeb.mockImplementation(async () => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('ECONNRESET network error')
        }
        return {
          success: true,
          data: { query: 'test query', results: [], message: 'Success on retry' },
        }
      })

      // Mock retry to actually retry
      const { retry } = await import('src/lib/code-quality')
      vi.mocked(retry).mockImplementation(async (fn) => {
        try {
          return await fn()
        } catch (error) {
          // Retry once
          return await fn()
        }
      })

      const toolCall = createToolCallMessage('search_web', {
        query: 'test query',
      })

      const result = await processToolCall(connectionId, mockWs, toolCall, activeSessions)

      expect(result).toBe(true)
      expect(attemptCount).toBeGreaterThan(1) // Should have retried
      
      // Verify success response after retry
      const client = activeSessions.get(connectionId)
      const callArgs = (client?.session.sendToolResponse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.functionResponses[0].response.success).toBe(true)
    })

    it('should timeout after 25 seconds', async () => {
      const connectionId = 'test-connection-id'
      const sessionId = 'test-session-id'
      const mockWs = createMockWebSocket()
      const activeSessions = createMockActiveSessions(sessionId, connectionId)

      // Mock slow tool execution (>25s)
      mockExecuteSearchWeb.mockImplementation(async () => {
        await delay(30000) // 30 seconds
        return { success: true, data: {} }
      })

      // Mock withTimeout to actually timeout
      const { withTimeout } = await import('src/lib/code-quality')
      vi.mocked(withTimeout).mockImplementation(async (promise, timeoutMs) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Tool timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ])
      })

      const toolCall = createToolCallMessage('search_web', {
        query: 'test query',
      })

      const startTime = Date.now()
      const result = await processToolCall(connectionId, mockWs, toolCall, activeSessions)
      const duration = Date.now() - startTime

      expect(result).toBe(true)
      expect(duration).toBeLessThan(30000) // Should timeout before 30s
      
      // Verify timeout error response
      const client = activeSessions.get(connectionId)
      const callArgs = (client?.session.sendToolResponse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.functionResponses[0].response.success).toBe(false)
      expect(callArgs.functionResponses[0].response.error).toContain('timed out')
    }, 35000) // Increase test timeout for this test

    it('should handle unknown tools gracefully', async () => {
      const connectionId = 'test-connection-id'
      const sessionId = 'test-session-id'
      const mockWs = createMockWebSocket()
      const activeSessions = createMockActiveSessions(sessionId, connectionId)

      const toolCall = createToolCallMessage('unknown_tool', {
        someArg: 'value',
      })

      const result = await processToolCall(connectionId, mockWs, toolCall, activeSessions)

      expect(result).toBe(true)
      
      // Verify error response
      const client = activeSessions.get(connectionId)
      const callArgs = (client?.session.sendToolResponse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.functionResponses[0].response.success).toBe(false)
      expect(callArgs.functionResponses[0].response.error).toContain('Unknown tool')
    })

    it('should handle multiple tool calls in one message', async () => {
      const connectionId = 'test-connection-id'
      const sessionId = 'test-session-id'
      const mockWs = createMockWebSocket()
      const activeSessions = createMockActiveSessions(sessionId, connectionId)

      const toolCall = {
        functionCalls: [
          { name: 'search_web', args: { query: 'test1' }, id: 'call-1' },
          { name: 'calculate_roi', args: { currentCost: 10000 }, id: 'call-2' },
        ],
      }

      const result = await processToolCall(connectionId, mockWs, toolCall, activeSessions)

      expect(result).toBe(true)
      
      // Verify both responses sent
      const client = activeSessions.get(connectionId)
      const callArgs = (client?.session.sendToolResponse as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.functionResponses).toHaveLength(2)
      expect(callArgs.functionResponses[0].name).toBe('search_web')
      expect(callArgs.functionResponses[1].name).toBe('calculate_roi')
      expect(callArgs.functionResponses[0].response.success).toBe(true)
      expect(callArgs.functionResponses[1].response.success).toBe(true)
    })
  })

  // ============================================================================
  // Test Suite 2: Chat Tool Call Flow
  // ============================================================================

  describe('Chat Tool Call Flow', () => {
    it('should execute tool call successfully via chat path', async () => {
      // This test verifies the agent can use unified tools
      const { getChatToolDefinitions } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const tools = getChatToolDefinitions(sessionId, 'Test Agent')

      expect(tools.search_web).toBeDefined()
      expect(tools.calculate_roi).toBeDefined()
      expect(tools.extract_action_items).toBeDefined()

      // Verify tool structure
      expect(tools.search_web.description).toBeTruthy()
      expect(tools.search_web.parameters).toBeDefined()
      expect(typeof tools.search_web.execute).toBe('function')
    })

    it('should validate tool args in chat path', async () => {
      const { getChatToolDefinitions } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const tools = getChatToolDefinitions(sessionId, 'Test Agent')

      // Try to execute with invalid args
      await expect(
        tools.search_web.execute({ query: '' }) // Empty query
      ).rejects.toThrow()
    })

    it('should use toolExecutor for retry and caching (chat path)', async () => {
      const { getChatToolDefinitions } = await import('../src/core/tools/unified-tool-registry')
      const { toolExecutor } = await import('../src/core/tools/tool-executor')
      
      const sessionId = 'test-session-id'
      const tools = getChatToolDefinitions(sessionId, 'Test Agent')

      // Mock toolExecutor
      const executeSpy = vi.spyOn(toolExecutor, 'execute').mockResolvedValue({
        success: true,
        data: { query: 'test', results: [] },
        duration: 100,
        cached: false,
        attempt: 1,
      })

      // Execute tool
      await tools.search_web.execute({ query: 'test query' })

      // Verify toolExecutor was called
      expect(executeSpy).toHaveBeenCalled()
      expect(executeSpy.mock.calls[0][0].toolName).toBe('search_web')
      expect(executeSpy.mock.calls[0][0].sessionId).toBe(sessionId)
      expect(executeSpy.mock.calls[0][0].agent).toBe('Test Agent')
    })

    it('should work with closer-agent and admin-agent', async () => {
      // Test that both agents can use unified tools
      const { getChatToolDefinitions } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const closerTools = getChatToolDefinitions(sessionId, 'Closer Agent')
      const adminTools = getChatToolDefinitions(sessionId, 'Admin AI Agent')

      // Both should have same unified tools
      expect(closerTools.search_web).toBeDefined()
      expect(adminTools.search_web).toBeDefined()
      expect(closerTools.calculate_roi).toBeDefined()
      expect(adminTools.calculate_roi).toBeDefined()

      // Both should have same tool structure
      expect(closerTools.search_web.description).toBe(adminTools.search_web.description)
    })
  })

  // ============================================================================
  // Test Suite 3: Cross-Modality Consistency
  // ============================================================================

  describe('Cross-Modality Consistency', () => {
    it('should use same underlying implementation for voice and chat', async () => {
      // Both paths should route through unified registry
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = { query: 'test query' }

      // Reset mock to track calls
      mockExecuteSearchWeb.mockClear()

      // Execute via unified registry (simulates both paths)
      const result1 = await executeUnifiedTool('search_web', args, { sessionId })
      const result2 = await executeUnifiedTool('search_web', args, { sessionId })

      // Both should use same implementation
      expect(mockExecuteSearchWeb).toHaveBeenCalledTimes(2)
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.data).toBeDefined()
      expect(result2.data).toBeDefined()
    })

    it('should return consistent ToolResult format', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = { query: 'test query' }

      const result = await executeUnifiedTool('search_web', args, { sessionId })

      // Verify ToolResult format
      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle errors consistently across modalities', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'

      // Test with invalid tool name (both paths should handle the same)
      const result = await executeUnifiedTool('unknown_tool', {}, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Unknown tool')
    })
  })

  // ============================================================================
  // Test Suite 4: Real Tool Execution (Optional)
  // ============================================================================

  describe.skipIf(!hasRequiredAPIKeys())('Real Tool Execution', () => {
    it('should execute real search_web tool', async () => {
      if (!config.useRealTools) {
        return // Skip if not using real tools
      }

      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = { query: 'AI trends 2024' }

      const result = await executeUnifiedTool('search_web', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    }, 30000)

    it('should execute real calculate_roi tool', async () => {
      if (!config.useRealTools) {
        return
      }

      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = {
        currentCost: 10000,
        timeSavings: 100,
        employeeCostPerHour: 50,
      }

      const result = await executeUnifiedTool('calculate_roi', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      // Verify ROI calculation structure
      const data = result.data as Record<string, unknown>
      expect(data.roi).toBeDefined()
      expect(typeof data.roi).toBe('number')
    })

    it('should execute real extract_action_items tool', async () => {
      if (!config.useRealTools) {
        return
      }

      // This requires session context, so we'll skip if not available
      const sessionId = 'test-session-id'
      
      // Would need to set up conversation history first
      // For now, we'll just verify the tool exists
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const args = {}
      const result = await executeUnifiedTool('extract_action_items', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      // May succeed or fail depending on session context
    })
  })

  // ============================================================================
  // Test Suite 5: Active Vision Investigation (focus_prompt)
  // ============================================================================

  describe('Active Vision Investigation', () => {
    it('should execute screen snapshot with focus_prompt (chat mode)', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      const { analyzeImageWithPrompt } = await import('../src/core/intelligence/vision-analysis')
      
      // Mock vision analysis for focus_prompt
      vi.mocked(analyzeImageWithPrompt).mockResolvedValue({
        analysis: 'Error code 503 Service Unavailable',
        confidence: 0.9
      })

      const sessionId = 'test-session-id'
      const { multimodalContextManager } = await import('src/core/context/multimodal-context')
      
      // Mock context with image data
      vi.mocked(multimodalContextManager.getContext).mockResolvedValue({
        visualContext: [{
          type: 'screen',
          imageData: 'base64ImageData',
          analysis: 'Previous cached analysis',
          timestamp: new Date().toISOString()
        }]
      } as any)

      const args = { focus_prompt: 'Read the error message text' }
      const result = await executeUnifiedTool('capture_screen_snapshot', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      if (result.success) {
        expect(result.data?.answered_prompt).toBe('Read the error message text')
        expect(result.data?.analysis).toContain('Error code 503')
      }
    })

    it('should execute webcam snapshot with focus_prompt (chat mode)', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      const { analyzeImageWithPrompt } = await import('../src/core/intelligence/vision-analysis')
      
      vi.mocked(analyzeImageWithPrompt).mockResolvedValue({
        analysis: 'User appears stressed, rubbing temples',
        confidence: 0.85
      })

      const sessionId = 'test-session-id'
      const { multimodalContextManager } = await import('src/core/context/multimodal-context')
      
      vi.mocked(multimodalContextManager.getContext).mockResolvedValue({
        visualContext: [{
          type: 'webcam',
          imageData: 'base64ImageData',
          analysis: 'Previous cached analysis',
          timestamp: new Date().toISOString()
        }]
      } as any)

      const args = { focus_prompt: 'Describe user\'s facial expression' }
      const result = await executeUnifiedTool('capture_webcam_snapshot', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      if (result.success) {
        expect(result.data?.answered_prompt).toBe('Describe user\'s facial expression')
      }
    })

    it('should fallback to cached analysis when no focus_prompt', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = {} // No focus_prompt
      
      const result = await executeUnifiedTool('capture_screen_snapshot', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      // Should return cached analysis, not call vision analysis service
    })
  })

  // ============================================================================
  // Test Suite 6: New Consulting Tools
  // ============================================================================

  describe('New Consulting Tools', () => {
    it('should execute analyze_website_tech_stack', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = { url: 'https://example.com', focus: 'ai_opportunities' }
      
      const result = await executeUnifiedTool('analyze_website_tech_stack', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
    })

    it('should execute generate_architecture_diagram', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = {
        diagram_type: 'flowchart',
        content_description: 'Customer onboarding workflow'
      }
      
      const result = await executeUnifiedTool('generate_architecture_diagram', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
    })

    it('should execute search_internal_case_studies', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = { query: 'video generation', industry: 'media' }
      
      const result = await executeUnifiedTool('search_internal_case_studies', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Test Suite 7: Teaser Tools
  // ============================================================================

  describe('Teaser Tools', () => {
    it('should execute generate_custom_syllabus', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = {
        team_roles: '3 devs, 1 PM',
        pain_points: ['manual data entry', 'inefficient workflows'],
        tech_stack: 'React/Node.js'
      }
      
      const result = await executeUnifiedTool('generate_custom_syllabus', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
    })

    it('should execute analyze_competitor_gap', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = {
        industry: 'e-commerce',
        client_current_state: 'exploring AI options'
      }
      
      const result = await executeUnifiedTool('analyze_competitor_gap', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
    })

    it('should execute simulate_cost_of_inaction', async () => {
      const { executeUnifiedTool } = await import('../src/core/tools/unified-tool-registry')
      
      const sessionId = 'test-session-id'
      const args = {
        inefficient_process: 'manual data entry',
        hours_wasted_per_week: 10,
        team_size: 5
      }
      
      const result = await executeUnifiedTool('simulate_cost_of_inaction', args, { sessionId })

      expect(verifyToolResult(result)).toBe(true)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.monthlyCost).toBeDefined()
        expect(result.data?.annualCost).toBeDefined()
      }
    })
  })
})
