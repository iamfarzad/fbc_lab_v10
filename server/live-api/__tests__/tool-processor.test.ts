/**
 * Tool Processor Tests - Updated for Unified Tool Registry
 * 
 * Tests the unified tool execution path with:
 * - Schema validation
 * - Retry logic
 * - Timeout handling
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processToolCall } from '../tool-processor';

// Mock unified tool registry
vi.mock('src/core/tools/unified-tool-registry', () => ({
  validateToolArgs: vi.fn().mockReturnValue({ valid: true }),
  executeUnifiedTool: vi.fn(),
  isTransientError: vi.fn().mockReturnValue(false),
}));

// Mock code-quality utilities
vi.mock('src/lib/code-quality', () => ({
  retry: vi.fn().mockImplementation((fn) => fn()),
  withTimeout: vi.fn().mockImplementation((promise) => promise),
}));

// Mock dependencies
vi.mock('../utils/env-setup', () => ({
  serverLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('src/core/context/capabilities', () => ({
  recordCapabilityUsed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('src/core/context/multimodal-context', () => ({
  multimodalContextManager: {
    addToolCallToLastTurn: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('processToolCall', () => {
  const connectionId = 'test-conn-id';
  const sessionId = 'test-session-id';
  let mockClient: any;
  let mockActiveSessions: any;
  let mockWs: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockClient = {
      sessionId,
      session: {
        sendToolResponse: vi.fn().mockResolvedValue(undefined),
      },
      logger: {
        log: vi.fn(),
      },
    };

    mockActiveSessions = {
      get: vi.fn().mockReturnValue(mockClient),
    };

    mockWs = {};
  });

  it('should execute search_web tool via unified registry', async () => {
    const { executeUnifiedTool } = await import('src/core/tools/unified-tool-registry');
    
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test query' }, id: 'call-1' }
      ]
    };

    const mockResult = { success: true, data: { results: [] } };
    vi.mocked(executeUnifiedTool).mockResolvedValue(mockResult as any);

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(executeUnifiedTool).toHaveBeenCalledWith(
      'search_web',
      { query: 'test query' },
      expect.objectContaining({
        sessionId,
        connectionId,
        activeSessions: mockActiveSessions
      })
    );
    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        { name: 'search_web', response: mockResult }
      ]
    });
  });

  it('should validate tool args before execution', async () => {
    const { validateToolArgs } = await import('src/core/tools/unified-tool-registry');
    
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: '' }, id: 'call-2' } // Invalid: empty query
      ]
    };

    vi.mocked(validateToolArgs).mockReturnValue({
      valid: false,
      error: 'Query cannot be empty'
    });

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(validateToolArgs).toHaveBeenCalledWith('search_web', { query: '' });
    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        expect.objectContaining({
          name: 'search_web',
          response: expect.objectContaining({
            success: false,
            error: 'Query cannot be empty'
          })
        })
      ]
    });
  });

  it('should handle unknown tools gracefully', async () => {
    const { validateToolArgs } = await import('src/core/tools/unified-tool-registry');
    
    const toolCall = {
      functionCalls: [
        { name: 'unknown_tool', args: {}, id: 'call-3' }
      ]
    };

    vi.mocked(validateToolArgs).mockReturnValue({
      valid: false,
      error: 'Unknown tool: unknown_tool'
    });

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        expect.objectContaining({
          name: 'unknown_tool',
          response: expect.objectContaining({
            success: false,
            error: expect.stringContaining('Unknown tool')
          })
        })
      ]
    });
  });

  it('should handle tool execution errors', async () => {
    const { executeUnifiedTool } = await import('src/core/tools/unified-tool-registry');
    
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test' }, id: 'call-4' }
      ]
    };

    vi.mocked(executeUnifiedTool).mockRejectedValue(new Error('API Error'));

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        expect.objectContaining({
          name: 'search_web',
          response: expect.objectContaining({
            success: false,
            error: 'API Error'
          })
        })
      ]
    });
  });

  it('should record capability usage on success', async () => {
    const { executeUnifiedTool } = await import('src/core/tools/unified-tool-registry');
    const { recordCapabilityUsed } = await import('src/core/context/capabilities');
    
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test' }, id: 'call-5' }
      ]
    };

    const mockResult = { success: true, data: { results: [] } };
    vi.mocked(executeUnifiedTool).mockResolvedValue(mockResult as any);

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(recordCapabilityUsed).toHaveBeenCalledWith(
      sessionId,
      'search',
      { tool: 'search_web', args: { query: 'test' } }
    );
  });

  it('should not record capability usage on failure', async () => {
    const { executeUnifiedTool } = await import('src/core/tools/unified-tool-registry');
    const { recordCapabilityUsed } = await import('src/core/context/capabilities');
    
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test' }, id: 'call-6' }
      ]
    };

    const mockResult = { success: false, error: 'Tool failed' };
    vi.mocked(executeUnifiedTool).mockResolvedValue(mockResult as any);

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(recordCapabilityUsed).not.toHaveBeenCalled();
  });

  it('should track tool calls in multimodal context', async () => {
    const { executeUnifiedTool } = await import('src/core/tools/unified-tool-registry');
    const { multimodalContextManager } = await import('src/core/context/multimodal-context');
    
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test' }, id: 'call-7' }
      ]
    };

    const mockResult = { success: true, data: { results: [] } };
    vi.mocked(executeUnifiedTool).mockResolvedValue(mockResult as any);

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(multimodalContextManager.addToolCallToLastTurn).toHaveBeenCalledWith(
      sessionId,
      {
        name: 'search_web',
        args: { query: 'test' },
        id: 'call-7'
      }
    );
  });

  it('should handle missing client gracefully', async () => {
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test' }, id: 'call-8' }
      ]
    };

    mockActiveSessions.get.mockReturnValue(null);

    const result = await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(result).toBe(false);
  });
});
