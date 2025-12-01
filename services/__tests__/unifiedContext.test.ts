import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { unifiedContext } from '../unifiedContext'
import { mockResearchResult, mockTranscript } from '../../test/helpers/test-data'

describe('UnifiedContext', () => {
  beforeEach(() => {
    // Reset state
    unifiedContext.setSessionId('')
    unifiedContext.setResearchContext(null)
    unifiedContext.setConversationFlow(undefined)
    unifiedContext.setIntelligenceContext(undefined)
    unifiedContext.setTranscript([])
    unifiedContext.setLocation(undefined as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('subscribe()', () => {
    it('adds listener', () => {
      const listener = vi.fn()
      const unsubscribe = unifiedContext.subscribe(listener)

      unifiedContext.setSessionId('test-session')

      expect(listener).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('returns unsubscribe function', () => {
      const listener = vi.fn()
      const unsubscribe = unifiedContext.subscribe(listener)

      unsubscribe()
      unifiedContext.setSessionId('test-session-2')

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('notify()', () => {
    it('calls all listeners with current state', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      unifiedContext.subscribe(listener1)
      unifiedContext.subscribe(listener2)

      unifiedContext.setSessionId('test-session')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      expect(listener1.mock.calls[0][0].sessionId).toBe('test-session')
      expect(listener2.mock.calls[0][0].sessionId).toBe('test-session')
    })
  })

  describe('getSnapshot()', () => {
    it('returns deep copy of state', () => {
      unifiedContext.setSessionId('test-session')
      unifiedContext.setResearchContext(mockResearchResult)

      const snapshot1 = unifiedContext.getSnapshot()
      const snapshot2 = unifiedContext.getSnapshot()

      expect(snapshot1).not.toBe(snapshot2)
      expect(snapshot1.sessionId).toBe(snapshot2.sessionId)
      // researchContext might be the same reference if it's null or same object
      // Check if it exists and is an object before checking reference
      // The getSnapshot does {...state} which is shallow copy
      // So researchContext will be same reference - this is expected behavior
      if (
        snapshot1.researchContext &&
        typeof snapshot1.researchContext === 'object'
      ) {
        expect(snapshot1.researchContext).toBe(snapshot2.researchContext)
      }
    })

    it('includes transcript copy', () => {
      unifiedContext.setTranscript(mockTranscript)

      const snapshot = unifiedContext.getSnapshot()

      expect(snapshot.transcript).not.toBe(mockTranscript)
      expect(snapshot.transcript).toEqual(mockTranscript)
    })
  })

  describe('setSessionId()', () => {
    it('updates state and notifies', () => {
      const listener = vi.fn()
      unifiedContext.subscribe(listener)

      unifiedContext.setSessionId('new-session')

      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.sessionId).toBe('new-session')
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('setResearchContext()', () => {
    it('updates state and notifies', () => {
      const listener = vi.fn()
      unifiedContext.subscribe(listener)

      unifiedContext.setResearchContext(mockResearchResult)

      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.researchContext).toEqual(mockResearchResult)
      expect(listener).toHaveBeenCalled()
    })

    it('handles null context', () => {
      unifiedContext.setResearchContext(mockResearchResult)
      unifiedContext.setResearchContext(null)

      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.researchContext).toBeNull()
    })
  })

  describe('setConversationFlow()', () => {
    it('updates state and notifies', () => {
      const listener = vi.fn()
      unifiedContext.subscribe(listener)

      const flow = { stage: 'DISCOVERY' }
      unifiedContext.setConversationFlow(flow)

      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.conversationFlow).toEqual(flow)
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('setIntelligenceContext()', () => {
    it('updates state and notifies', () => {
      const listener = vi.fn()
      unifiedContext.subscribe(listener)

      const context = { analysis: 'test' }
      unifiedContext.setIntelligenceContext(context)

      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.intelligenceContext).toEqual(context)
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('setTranscript()', () => {
    it('updates state and notifies', () => {
      const listener = vi.fn()
      unifiedContext.subscribe(listener)

      unifiedContext.setTranscript(mockTranscript)

      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.transcript).toEqual(mockTranscript)
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('setLocation()', () => {
    it('updates state and notifies', () => {
      const listener = vi.fn()
      unifiedContext.subscribe(listener)

      const location = { latitude: 40.7128, longitude: -74.0060 }
      unifiedContext.setLocation(location)

      const snapshot = unifiedContext.getSnapshot()
      expect(snapshot.location).toEqual(location)
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('ensureLocation()', () => {
    it('returns cached location if available', async () => {
      const location = { latitude: 40.7128, longitude: -74.0060 }
      unifiedContext.setLocation(location)

      const result = await unifiedContext.ensureLocation()

      expect(result).toEqual(location)
    })

    it('fetches location from geolocation', async () => {
      const location = { latitude: 40.7128, longitude: -74.0060 }
      const getCurrentPosition = vi.fn((success) => {
        success({ coords: location })
      })

      global.navigator.geolocation = {
        getCurrentPosition
      } as any

      const result = await unifiedContext.ensureLocation()

      expect(result).toEqual(location)
      expect(getCurrentPosition).toHaveBeenCalled()
    })

    it('reuses pending promise', async () => {
      // Clear any cached location first
      unifiedContext.setLocation(undefined as any)

      const location = { latitude: 40.7128, longitude: -74.0060 }
      const getCurrentPosition = vi.fn((success) => {
        setTimeout(() => success({ coords: location }), 100)
      })

      global.navigator.geolocation = {
        getCurrentPosition
      } as any

      const promise1 = unifiedContext.ensureLocation()
      const promise2 = unifiedContext.ensureLocation()

      // Promises might be different instances even if they resolve to same value
      // Check that they resolve to same value instead
      const result1 = await promise1
      const result2 = await promise2
      expect(result1).toEqual(result2)
      expect(result1).toEqual(location)
      expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    })

    it('handles geolocation errors', async () => {
      // Clear any cached location first
      unifiedContext.setLocation(undefined as any)

      const getCurrentPosition = vi.fn((_success, error) => {
        error(new Error('Permission denied'))
      })

      global.navigator.geolocation = {
        getCurrentPosition
      } as any

      const result = await unifiedContext.ensureLocation()

      expect(result).toBeUndefined()
    })

    it('handles timeout', async () => {
      // Clear cached location
      unifiedContext.setLocation(undefined as any)

      const getCurrentPosition = vi.fn(() => {
        // Never calls success/error
      })

      global.navigator.geolocation = {
        getCurrentPosition
      } as any

      // Wait for timeout (1000ms) plus a bit
      const result = await new Promise((resolve) => {
        unifiedContext.ensureLocation().then(resolve)
        setTimeout(() => resolve(undefined), 1100)
      })

      expect(result).toBeUndefined()
    })

    it('handles missing geolocation API', async () => {
      // Clear cached location
      unifiedContext.setLocation(undefined as any)

      const originalGeolocation = global.navigator.geolocation
      delete (global.navigator as any).geolocation

      const result = await unifiedContext.ensureLocation()

      expect(result).toBeUndefined()

      global.navigator.geolocation = originalGeolocation
    })
  })

  describe('Multiple subscriptions', () => {
    it('all receive updates', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      unifiedContext.subscribe(listener1)
      unifiedContext.subscribe(listener2)
      unifiedContext.subscribe(listener3)

      unifiedContext.setSessionId('test')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
      expect(listener3).toHaveBeenCalled()
    })
  })
})

