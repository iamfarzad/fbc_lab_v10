import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processToolCall } from '../tool-processor';
import * as toolImplementations from '../utils/tool-implementations';

// Mock dependencies
vi.mock('../utils/env-setup', () => ({
  serverLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../utils/tool-implementations', () => ({
  executeSearchWeb: vi.fn(),
  executeExtractActionItems: vi.fn(),
  executeCalculateROI: vi.fn(),
  executeGenerateSummaryPreview: vi.fn(),
  executeDraftFollowUpEmail: vi.fn(),
  executeGenerateProposalDraft: vi.fn(),
  executeCaptureScreenSnapshot: vi.fn(),
  executeCaptureWebcamSnapshot: vi.fn(),
  executeGetDashboardStats: vi.fn(),
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

    mockWs = {}; // processToolCall doesn't use ws methods directly currently
  });

  it('should execute search_web tool', async () => {
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test query' }, id: 'call-1' }
      ]
    };

    const mockResult = { success: true, data: { results: [] } };
    vi.spyOn(toolImplementations, 'executeSearchWeb').mockResolvedValue(mockResult as any);

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(toolImplementations.executeSearchWeb).toHaveBeenCalledWith({ query: 'test query' });
    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        { name: 'search_web', response: mockResult }
      ]
    });
  });

  it('should execute calculate_roi tool', async () => {
    const toolCall = {
      functionCalls: [
        { name: 'calculate_roi', args: { investment: 1000 }, id: 'call-2' }
      ]
    };

    const mockResult = { success: true, data: { roi: 50 } };
    vi.spyOn(toolImplementations, 'executeCalculateROI').mockResolvedValue(mockResult as any);

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(toolImplementations.executeCalculateROI).toHaveBeenCalledWith({ investment: 1000 });
    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        { name: 'calculate_roi', response: mockResult }
      ]
    });
  });

  it('should handle unknown tools gracefully', async () => {
    const toolCall = {
      functionCalls: [
        { name: 'unknown_tool', args: {}, id: 'call-3' }
      ]
    };

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        expect.objectContaining({
          name: 'unknown_tool',
          response: expect.objectContaining({ success: false, error: expect.stringContaining('Unknown tool') })
        })
      ]
    });
  });

  it('should handle tool execution errors', async () => {
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'fail' }, id: 'call-4' }
      ]
    };

    vi.spyOn(toolImplementations, 'executeSearchWeb').mockRejectedValue(new Error('API Error'));

    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);

    expect(mockClient.session.sendToolResponse).toHaveBeenCalledWith({
      functionResponses: [
        expect.objectContaining({
          name: 'search_web',
          response: expect.objectContaining({ success: false, error: 'API Error' })
        })
      ]
    });
  });

  it('should record tool usage in multimodal context', async () => {
    const toolCall = {
      functionCalls: [
        { name: 'search_web', args: { query: 'test' }, id: 'call-5' }
      ]
    };
    
    // Need to mock dynamic import of multimodal-context
    // The mock at top level handles this for the import inside processToolCall
    vi.spyOn(toolImplementations, 'executeSearchWeb').mockResolvedValue({ success: true } as any);
    
    await processToolCall(connectionId, mockWs, toolCall, mockActiveSessions);
    
    const { multimodalContextManager } = await import('src/core/context/multimodal-context');
    expect(multimodalContextManager.addToolCallToLastTurn).toHaveBeenCalledWith(
      sessionId,
      { name: 'search_web', args: { query: 'test' }, id: 'call-5' }
    );
  });
});

