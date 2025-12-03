import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LiveClientWS } from '../client'

// Mock WebSocket
vi.mock('ws', () => {
  return {
    WebSocket: vi.fn(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1 // OPEN
    }))
  }
})

describe('LiveClientWS', () => {
  let client: LiveClientWS

  beforeEach(() => {
    vi.clearAllMocks()
    client = new LiveClientWS()
    // Manually trigger connection to get access to the internal WS instance if needed
    // But since we can't easily access the private ws property, we'll test via public methods or by simulating events if possible.
    // Actually, LiveClientWS logic is hard to test without exposing internals or using a more complex mock setup.
    // However, we can test the `routeEvent` method if we can access it or simulate the message event.
  })

  it('should handle malformed messages without crashing', () => {
    // We need to simulate a message event.
    // Since `routeEvent` is private, we might need to cast to any or use a different approach.
    // Or we can simulate the 'message' event on the WebSocket if we can get a reference to it.

    // Let's try to spy on the emit method to verify it DOESN'T emit for malformed messages
    const emitSpy = vi.spyOn(client as any, 'emit')

    // Access private method for testing purposes
    const routeEvent = (client as any).routeEvent.bind(client)

    // Test cases for malformed payloads

    // 1. Input Transcript with missing payload
    routeEvent({ type: 'input_transcript' }) // Should not throw and should not emit
    expect(emitSpy).not.toHaveBeenCalledWith(
      'input_transcript',
      expect.anything(),
      expect.anything()
    )

    // 2. Tool Call with missing payload
    routeEvent({ type: 'tool_call' })
    expect(emitSpy).not.toHaveBeenCalledWith('tool_call', expect.anything())

    // 3. Session Started with missing payload
    routeEvent({ type: 'session_started' })
    // Should not set sessionActive to true (we can't check private state easily, but we can check it didn't crash)

    // 4. Valid message should still work
    routeEvent({
      type: 'input_transcript',
      payload: { text: 'Hello', isFinal: true }
    })
    expect(emitSpy).toHaveBeenCalledWith('input_transcript', 'Hello', true)
  })
})

