/**
 * Tool Integration Test Helpers
 * 
 * Shared utilities for E2E tool integration tests
 */

import { vi } from 'vitest'
import type { WebSocket } from 'ws'
import type { ToolResult } from 'src/core/tools/unified-tool-registry'
import type { ToolProcessorClient, ActiveSessionsMap } from 'server/live-api/tool-processor'

/**
 * Create a mock WebSocket for testing
 */
export function createMockWebSocket(): WebSocket {
  return {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    url: '',
    protocol: '',
    extensions: '',
    binaryType: 'arraybuffer',
    bufferedAmount: 0,
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    ping: vi.fn(),
    pong: vi.fn(),
    terminate: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as WebSocket
}

/**
 * Create a mock active sessions map
 */
export function createMockActiveSessions(
  sessionId: string = 'test-session-id',
  connectionId: string = 'test-connection-id'
): ActiveSessionsMap {
  const mockClient: ToolProcessorClient = {
    sessionId,
    session: {
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    },
    logger: {
      log: vi.fn(),
    },
    latestContext: {
      screen: { analysis: 'Mock screen analysis' },
      webcam: { analysis: 'Mock webcam analysis' },
    },
  }

  return {
    get: vi.fn().mockReturnValue(mockClient),
  }
}

/**
 * Create a tool call message in Gemini Live API format
 */
export function createToolCallMessage(
  toolName: string,
  args: Record<string, unknown> = {},
  id: string = 'test-call-id'
) {
  return {
    functionCalls: [
      {
        name: toolName,
        args,
        id,
      },
    ],
  }
}

/**
 * Create a chat API request with messages
 */
export function createChatRequest(
  messages: Array<{ role: string; content: string }>,
  sessionId: string = 'test-session-id',
  intelligenceContext: unknown = {},
  multimodalContext: unknown = {}
) {
  return {
    method: 'POST',
    body: {
      messages,
      sessionId,
      intelligenceContext,
      multimodalContext,
    },
    headers: {
      'content-type': 'application/json',
    },
  }
}

/**
 * Wait for tool call to complete
 */
export async function waitForToolCall(
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout)
  })
}

/**
 * Verify tool result format matches ToolResult interface
 */
export function verifyToolResult(result: unknown): result is ToolResult {
  if (!result || typeof result !== 'object') {
    return false
  }

  const toolResult = result as ToolResult

  // Must have success boolean
  if (typeof toolResult.success !== 'boolean') {
    return false
  }

  // If success, should have data
  if (toolResult.success && toolResult.data === undefined) {
    // Data is optional, but typically present on success
    // This is a warning, not a failure
  }

  // If not success, should have error
  if (!toolResult.success && !toolResult.error) {
    return false
  }

  return true
}

/**
 * Create a mock Vercel Request object
 */
export function createMockVercelRequest(
  body: unknown,
  headers: Record<string, string> = {}
) {
  return {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    query: {},
    cookies: {},
    url: '/api/chat',
  }
}

/**
 * Create a mock Vercel Response object
 */
export function createMockVercelResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    headers: {},
    statusCode: 200,
  }

  return res
}

/**
 * Extract tool calls from agent response
 */
export function extractToolCalls(response: unknown): Array<{ name: string; args: unknown }> {
  if (!response || typeof response !== 'object') {
    return []
  }

  const responseObj = response as Record<string, unknown>
  
  // Check for toolCalls in metadata or directly
  if (Array.isArray(responseObj.toolCalls)) {
    return responseObj.toolCalls as Array<{ name: string; args: unknown }>
  }

  if (responseObj.metadata && typeof responseObj.metadata === 'object') {
    const metadata = responseObj.metadata as Record<string, unknown>
    if (Array.isArray(metadata.toolCalls)) {
      return metadata.toolCalls as Array<{ name: string; args: unknown }>
    }
  }

  return []
}

/**
 * Create a mock tool implementation that can be controlled
 */
export function createMockToolImplementation(
  toolName: string,
  result: ToolResult | (() => Promise<ToolResult>)
) {
  return {
    [toolName]: vi.fn().mockImplementation(
      typeof result === 'function' ? result : async () => result
    ),
  }
}

/**
 * Create a delay for testing timeouts
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}




