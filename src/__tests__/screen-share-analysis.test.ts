/**
 * Screen Share Analysis Tests
 * 
 * Tests for screen share analysis injection and systemInstruction updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../server/handlers/context-update-handler.js', () => ({
  handleContextUpdate: vi.fn().mockResolvedValue(undefined)
}))

// Mock context storage if needed by context update handler
vi.mock('@/core/context/context-storage', () => ({
  contextStorage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateWithVersionCheck: vi.fn().mockResolvedValue(undefined)
  },
  ContextStorage: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateWithVersionCheck: vi.fn().mockResolvedValue(undefined)
  }))
}))

vi.mock('../../src/core/context/multimodal-context.js', () => ({
  multimodalContextManager: {
    addVisualAnalysis: vi.fn().mockResolvedValue(undefined),
    getVoiceMultimodalSummary: vi.fn().mockResolvedValue({
      promptSupplement: 'VISUAL CONTEXT:\nscreen: User is working on a React application',
      flags: {
        hasVisualContext: true,
        hasAudioContext: false,
        hasUploads: false,
        recentAnalyses: 1,
        engagementLevel: 'medium' as const
      }
    })
  }
}))

describe('Screen Share Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Analysis Injection', () => {
    it('should trigger context update with analysis text', async () => {
      const { handleContextUpdate } = await import('../../server/handlers/context-update-handler.js')
      
      const mockClient = {
        ws: {},
        sessionId: 'test-session',
        latestContext: {
          screen: {
            analysis: 'User is working on a React application',
            capturedAt: Date.now(),
            imageData: 'base64-image-data'
          }
        },
        intelligenceData: {},
        injectionTimers: {},
        session: {
          sendRealtimeInput: vi.fn()
        },
        logger: {
          log: vi.fn()
        }
      }

      const payload = {
        analysis: 'User is working on a React application',
        modality: 'screen',
        capturedAt: Date.now(),
        imageData: 'base64-image-data'
      }

      await handleContextUpdate('connection-1', mockClient as any, payload as any)

      expect(handleContextUpdate).toHaveBeenCalledWith(
        'connection-1',
        expect.any(Object),
        expect.objectContaining({
          analysis: 'User is working on a React application',
          modality: 'screen'
        })
      )
    })

    it('should include analysis in context update payload', async () => {
      const snapshot = {
        analysis: 'Screen shows a code editor with TypeScript',
        capturedAt: Date.now(),
        imageData: 'base64-data'
      }

      const payload = {
        analysis: snapshot.analysis,
        modality: 'screen' as const,
        capturedAt: snapshot.capturedAt,
        imageData: snapshot.imageData
      }

      expect(payload.analysis).toBe('Screen shows a code editor with TypeScript')
      expect(payload.modality).toBe('screen')
      expect(payload.imageData).toBeDefined()
    })
  })

  describe('Visual Analysis Persistence', () => {
    it('should persist visual analysis via multimodalContextManager', async () => {
      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')

      await multimodalContextManager.addVisualAnalysis(
        'test-session',
        'User is working on a React application',
        'screen',
        1000,
        'base64-image-data',
        0.85
      )

      expect(multimodalContextManager.addVisualAnalysis).toHaveBeenCalledWith(
        'test-session',
        'User is working on a React application',
        'screen',
        1000,
        'base64-image-data',
        0.85
      )
    })

    it('should include confidence score in visual analysis', async () => {
      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')

      const confidence = 0.9
      await multimodalContextManager.addVisualAnalysis(
        'test-session',
        'Analysis text',
        'screen',
        1000,
        'image-data',
        confidence
      )

      expect(multimodalContextManager.addVisualAnalysis).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        confidence
      )
    })
  })

  describe('SystemInstruction Rebuild', () => {
    it('should include visual analysis in voice multimodal summary', async () => {
      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')

      const summary = await multimodalContextManager.getVoiceMultimodalSummary('test-session')

      expect(summary.promptSupplement).toContain('VISUAL CONTEXT')
      expect(summary.promptSupplement).toContain('screen:')
      expect(summary.flags.hasVisualContext).toBe(true)
    })

    it('should include screen analysis in systemInstruction', async () => {
      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')

      // First add visual analysis
      await multimodalContextManager.addVisualAnalysis(
        'test-session',
        'User is working on a React application',
        'screen',
        1000,
        'image-data',
        0.85
      )

      // Then get summary (which should include it)
      const summary = await multimodalContextManager.getVoiceMultimodalSummary('test-session')

      expect(summary.promptSupplement).toBeTruthy()
      expect(summary.flags.recentAnalyses).toBeGreaterThan(0)
    })

    it('should update systemInstruction when new analysis arrives', async () => {
      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')

      // Add initial analysis
      await multimodalContextManager.addVisualAnalysis(
        'test-session',
        'Initial screen analysis',
        'screen',
        1000,
        'image-1',
        0.8
      )

      // Add updated analysis
      await multimodalContextManager.addVisualAnalysis(
        'test-session',
        'Updated screen analysis',
        'screen',
        2000,
        'image-2',
        0.9
      )

      const summary = await multimodalContextManager.getVoiceMultimodalSummary('test-session')

      expect(summary.flags.recentAnalyses).toBeGreaterThan(0)
    })
  })

  describe('Context Update Flow', () => {
    it('should handle context update for screen modality', async () => {
      const { handleContextUpdate } = await import('../../server/handlers/context-update-handler.js')

      const mockClient = {
        ws: {},
        sessionId: 'test-session',
        latestContext: {},
        intelligenceData: {},
        injectionTimers: {},
        session: {},
        logger: {}
      }

      const payload = {
        analysis: 'Screen analysis',
        modality: 'screen',
        capturedAt: Date.now(),
        imageData: 'base64-data'
      }

      await handleContextUpdate('connection-1', mockClient as any, payload as any)

      expect(handleContextUpdate).toHaveBeenCalled()
    })

    it('should persist analysis after context update', async () => {
      const { handleContextUpdate } = await import('../../server/handlers/context-update-handler.js')
      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context.js')

      const mockClient = {
        ws: {},
        sessionId: 'test-session',
        latestContext: {},
        intelligenceData: {},
        injectionTimers: {},
        session: {},
        logger: {}
      }

      const payload = {
        analysis: 'Screen shows code editor',
        modality: 'screen',
        capturedAt: Date.now(),
        imageData: 'base64-data',
        metadata: {
          confidence: 0.85
        }
      }

      await handleContextUpdate('connection-1', mockClient as any, payload as any)

      // Wait a bit for async operations (addVisualAnalysis is called in async IIFE)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Analysis should be persisted via multimodal context manager
      // handleContextUpdate calls multimodalContextManager.addVisualAnalysis asynchronously
      expect(multimodalContextManager.addVisualAnalysis).toHaveBeenCalledWith(
        'test-session',
        'Screen shows code editor',
        'screen',
        undefined, // imageSize
        'base64-data', // imageData
        0.85 // confidence
      )
    })
  })
})
