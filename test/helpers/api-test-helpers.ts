/**
 * API Test Helpers
 * 
 * Utilities for testing API endpoints, SSE streaming, and performance measurements
 * Reuses patterns from scripts/test-streaming.ts
 */

/**
 * Parse SSE stream and return all events
 * Reuses logic from scripts/test-streaming.ts
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const decoder = new TextDecoder()
  let buffer = ''
  const events: Array<{ type: string; [key: string]: unknown }> = []
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataText = line.slice(6).trim()
        if (dataText && dataText !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataText)
            events.push(parsed)
          } catch (e) {
            // Ignore parse errors
          }
        } else if (dataText === '[DONE]') {
          return events
        }
      }
    }
  }
  
  return events
}

/**
 * Measure time to first chunk from SSE stream
 */
export async function measureTimeToFirstChunk(
  response: Response
): Promise<{ timeMs: number; firstEvent: { type: string; [key: string]: unknown } | null }> {
  const startTime = Date.now()
  const reader = response.body?.getReader()
  
  if (!reader) {
    throw new Error('No reader available')
  }
  
  const decoder = new TextDecoder()
  let buffer = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataText = line.slice(6).trim()
        if (dataText && dataText !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataText)
            const timeMs = Date.now() - startTime
            return { timeMs, firstEvent: parsed }
          } catch (e) {
            // Continue if parse fails
          }
        }
      }
    }
  }
  
  return { timeMs: Date.now() - startTime, firstEvent: null }
}

/**
 * Test API endpoint with streaming
 */
export async function testStreamingEndpoint(
  url: string,
  body: Record<string, unknown>
): Promise<{
  response: Response
  events: Array<{ type: string; [key: string]: unknown }>
  timeToFirstChunk: number
}> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }
  
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('text/event-stream')) {
    throw new Error('Response is not SSE stream')
  }
  
  // Parse stream and measure time to first chunk in single pass
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No reader available')
  }
  
  const decoder = new TextDecoder()
  let buffer = ''
  const events: Array<{ type: string; [key: string]: unknown }> = []
  let timeToFirstChunk = 0
  const startTime = Date.now()
  let firstChunkFound = false
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataText = line.slice(6).trim()
        if (dataText && dataText !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataText)
            if (!firstChunkFound) {
              timeToFirstChunk = Date.now() - startTime
              firstChunkFound = true
            }
            events.push(parsed)
          } catch (e) {
            // Ignore parse errors
          }
        } else if (dataText === '[DONE]') {
          return {
            response,
            events,
            timeToFirstChunk
          }
        }
      }
    }
  }
  
  return {
    response,
    events,
    timeToFirstChunk
  }
}

/**
 * Verify SSE headers are set correctly
 */
export function verifySSEHeaders(response: Response): void {
  expect(response.headers.get('content-type')).toContain('text/event-stream')
  expect(response.headers.get('cache-control')).toBe('no-cache')
  expect(response.headers.get('connection')).toBe('keep-alive')
}
