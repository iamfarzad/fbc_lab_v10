/**
 * Centralized Mock Helpers
 * 
 * Provides reusable mock factories for common test scenarios.
 * Ensures consistency across test files and reduces duplication.
 */

import { vi } from 'vitest'
import type { GenerateTextResult } from 'ai'

/**
 * Create a mock GenerateTextResult that matches AI SDK structure
 */
export function createMockGenerateTextResult(overrides: Partial<GenerateTextResult<any, any>> = {}): GenerateTextResult<any, any> {
  const defaultText = overrides.text || 'Mocked response'
  
  return {
    text: defaultText,
    response: {
      text: () => defaultText,
      headers: new Headers({
        'x-gemini-usage-token-count': '100',
        'x-goog-ai-generative-usage': JSON.stringify({ 
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150
        }),
        'content-type': 'application/json'
      }),
      rawResponse: new Response(null, { 
        status: 200,
        headers: new Headers({
          'x-gemini-usage-token-count': '100'
        })
      })
    },
    toolCalls: [],
    finishReason: 'stop',
    usage: {
      promptTokens: 100,
      completionTokens: 50
    },
    ...overrides
  }
}

/**
 * Create a mock ContextStorage instance
 */
export function createMockContextStorage(overrides: Partial<{
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  updateWithVersionCheck: ReturnType<typeof vi.fn>
}> = {}) {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateWithVersionCheck: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

/**
 * Create a mock Response object with proper headers
 */
export function createMockResponse(
  body: any = {},
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  const headers = new Headers({
    'content-type': 'application/json',
    'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 }),
    ...options.headers
  })

  return new Response(JSON.stringify(body), {
    status: options.status || 200,
    headers
  })
}

/**
 * Create a mock generateObject result
 */
export function createMockGenerateObjectResult<T extends Record<string, any>>(
  object: T,
  overrides: Partial<{ response: Partial<Response> }> = {}
) {
  return {
    object,
    response: {
      headers: new Headers({
        'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
      }),
      rawResponse: new Response(null, { status: 200 }),
      ...overrides.response
    }
  }
}

/**
 * Create a mock fetch function that returns proper Response objects
 */
export function createMockFetch(responses: Array<{ body: any; status?: number; headers?: Record<string, string> }>) {
  let callCount = 0
  
  return vi.fn().mockImplementation(async () => {
    const response = responses[callCount % responses.length]
    callCount++
    return createMockResponse(response.body, {
      status: response.status,
      headers: response.headers
    })
  })
}
