import { vi } from 'vitest'

export class MockLiveClientWS {
  private listeners = new Map<string, Set<(...args: any[]) => void>>()
  public connect = vi.fn(() => {
    // Simulate connection
    setTimeout(() => {
      this.trigger('connected', 'mock-connection-id')
    }, 10)
  })
  public disconnect = vi.fn()
  public start = vi.fn((opts?: any) => {
    // Simulate start_ack
    setTimeout(() => {
      this.trigger('start_ack', { connectionId: 'mock-connection-id' })
    }, 10)
    // Simulate session_started
    setTimeout(() => {
      this.trigger('session_started', { connectionId: 'mock-connection-id' })
    }, 20)
  })
  public sendText = vi.fn()
  public sendRealtimeInput = vi.fn()
  public sendContextUpdate = vi.fn()
  public sendToolResponse = vi.fn()
  public on = vi.fn((event: string, callback: (...args: any[]) => void) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  })
  public off = vi.fn((event: string, callback: (...args: any[]) => void) => {
    this.listeners.get(event)?.delete(callback)
  })

  public trigger(event: string, ...args: any[]) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((fn) => fn(...args))
    }
  }
}

export function createMockLiveClientWS() {
  return new MockLiveClientWS()
}

